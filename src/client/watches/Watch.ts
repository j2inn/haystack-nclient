/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HGrid, HDict, HFilter, Node, HRef } from 'haystack-core'
import { Ids, getId, idsToArray } from '../../util/hval'
import { Subject } from './Subject'
import {
	WatchEvent,
	WatchEventType,
	WatchIdsEvent,
	WatchChangedEvent,
	WatchChanged,
} from './WatchEvent'
import { clear } from '../../util/obj'

/**
 * The default poll rate in seconds.
 */
export const DEFAULT_POLL_RATE_SECS = 5

/**
 * A list of open all watches.
 *
 * This list is held for debugging purposes.
 */
const watches = new Set<Watch>()

/**
 * A watch event callback.
 */
export interface WatchEventCallback {
	(event: WatchEvent, watch: Watch): void
}

/**
 * A haystack Watch.
 */
export class Watch {
	/**
	 * The subject the watch is observing.
	 */
	readonly #subject: Subject

	/**
	 * The grid for the watch.
	 */
	public readonly grid: HGrid

	/**
	 * The display name for the watch.
	 */
	readonly #watchDisplay: string

	/**
	 * Flag indicating whether the watch is closed.
	 */
	#closed = false

	/**
	 * An object that holds dict indexes in the grid.
	 */
	readonly #idsToGridIndexes: { [prop: string]: number } = {}

	/**
	 * The poll rate for this watch.
	 */
	#pollRate: number = DEFAULT_POLL_RATE_SECS

	/**
	 * Watch event callbacks.
	 */
	readonly #callbacks: Map<WatchEventType, Set<WatchEventCallback>> =
		new Map()

	/**
	 * Constructs a new watch.
	 *
	 * Please note, all watches must be closed when no longer used.
	 *
	 * @param watchDisplay A client side display name for the watch.
	 * @param subject The watch will observe this subject.
	 * @param grid An empty grid to use for the watch.
	 */
	public constructor(
		watchDisplay: string,
		subject: Subject,
		grid: HGrid = HGrid.make({})
	) {
		this.#watchDisplay = watchDisplay
		this.#subject = subject
		this.grid = grid

		this.#subject.on(this.$onChanged)
	}

	/**
	 * Returns a list of watches.
	 *
	 * ```typescript
	 * hs.Watch.watches.forEach((watch: Watch): void => {
	 *   console.log(`We have watch: ${watch.display}`)
	 * })
	 * ```
	 *
	 * @returns A list of all open watches.
	 */
	public static get watches(): Watch[] {
		return [...watches]
	}

	/**
	 * Inspect all the watches available.
	 *
	 * ```typescript
	 * hs.Watch.inspectAll()
	 * ```
	 */
	public static inspectAll(): void {
		this.watches.forEach((watch: Watch): void => {
			watch.inspect()
		})
	}

	/**
	 * Dump the watch to the local console output.
	 *
	 * ```typescript
	 * watch.inspect()
	 * ```
	 *
	 * @returns The value instance.
	 */
	public inspect(): this {
		this.grid.inspect(this.display)
		return this
	}

	/**
	 * Dump the watch's subject to the local console output.
	 *
	 * ```typescript
	 * watch.inspectSubject()
	 * ```
	 *
	 * @returns The value instance.
	 */
	public inspectSubject(): this {
		this.#subject.inspect()
		return this
	}

	/**
	 * ```typescript
	 * console.log(watch.display)
	 * ```
	 *
	 * @returns The display name of the watch.
	 */
	public get display(): string {
		return `${this.#watchDisplay} @ ${this.#subject.display}`
	}

	/**
	 * @returns A string representation of a watch.
	 */
	public toString(): string {
		return this.display
	}

	/**
	 * Returns true if the watch is closed.
	 *
	 * ```typescript
	 * if (watch.isClosed()) {
	 *   // Do something
	 * }
	 * ```
	 *
	 * @returns True if the watch is closed. A closed watch
	 * can no longer be used.
	 */
	public isClosed(): boolean {
		return this.#closed
	}

	/**
	 * @throws An error if the watch is closed.
	 */
	private throwErrorIfClosed(): void {
		if (this.#closed) {
			throw new Error('Watch is closed')
		}
	}

	/**
	 * Return a new opened watch.
	 *
	 * Please note, all watches must be closed when no longer used.
	 *
	 * @param options.subject The watch subject.
	 * @param options.ids The ids to watch.
	 * @param options.display Display name for the watch.
	 * @param options.grid Optional grid to use for the watch.
	 * @returns An opened watch.
	 */
	public static async open({
		subject,
		ids,
		display,
		grid,
	}: {
		subject: Subject
		ids: Ids
		display: string
		grid?: HGrid
	}): Promise<Watch> {
		const watch = new Watch(display, subject, grid)
		await watch.add(ids)
		return watch
	}

	/**
	 * Close all watches for the given subject.
	 *
	 * Please note, this method doesn't normally need to be called
	 * and is designed to be used internally. If you want
	 * to close a watch then please just call `Watch.#close()` instead.
	 *
	 * @param subject The subject to close watches for.
	 */
	public static async close(subject: Subject): Promise<void> {
		await Promise.all(
			[...watches]
				.filter((watch) => watch.#subject === subject)
				.map((watch) => watch.close())
		)
	}

	/**
	 * Add records to watch.
	 *
	 * ```typescript
	 * await watch.add('@someid')
	 * ```
	 *
	 * @param ids The ids to add.
	 */
	public async add(ids: Ids): Promise<void> {
		this.throwErrorIfClosed()
		watches.add(this)

		this.computeSubjectPollRate()

		// Only add dicts that aren't already added.
		const toAdd = idsToArray(ids).filter(
			(id: string): boolean => this.#idsToGridIndexes[id] === undefined
		)

		if (toAdd.length) {
			await this.#subject.add(toAdd)

			const event: WatchIdsEvent = {
				type: WatchEventType.Added,
				ids: this.addDictsToGrid(toAdd),
			}

			this.fire(event)
		}
	}

	/**
	 * Add new dicts to the watch's grid.
	 *
	 * @param toAdd The ids to add.
	 * @returns The new ids added.
	 */
	private addDictsToGrid(toAdd: string[]): string[] {
		const addedIds: string[] = []
		const dictsToAdd: HDict[] = []

		let index = this.grid.length

		for (const id of toAdd) {
			// Ignore duplicates.
			if (this.#idsToGridIndexes[id] === undefined) {
				addedIds.push(id)

				let dict = this.#subject.get(id)

				if (!dict || dict.isEmpty()) {
					// If a dict can't be found then this could be a timing issue where the dict
					// isn't added to the subject yet. In this scenario, create a place holder dict.
					dict = new HDict({ id: HRef.make(id) })
				} else {
					// Always create a new copy because we want to
					// track the changes in our local
					// grid when updates are made.
					dict = dict.newCopy()
				}

				dictsToAdd.push(dict)
				this.#idsToGridIndexes[id] = index++
			}
		}

		if (dictsToAdd.length) {
			this.addToGrid(dictsToAdd)
		}
		return addedIds
	}

	/**
	 * Remove records to watch.
	 *
	 * This is called to stop watching records.
	 *
	 * ```typescript
	 * await watch.remove('@someid')
	 * ```
	 *
	 * @param ids The ids to remove.
	 */
	public async remove(ids: Ids): Promise<void> {
		this.throwErrorIfClosed()

		// Only remove dicts that are already added.
		const toRemove = idsToArray(ids).filter(
			(id: string): boolean => this.#idsToGridIndexes[id] !== undefined
		)

		if (toRemove.length) {
			await this.#subject.remove(toRemove)

			const event: WatchIdsEvent = {
				type: WatchEventType.Removed,
				ids: this.removeDictsFromGrid(toRemove),
			}

			this.fire(event)
		}
	}

	/**
	 * Removes dicts from the watch's grid.
	 *
	 * @param toRemove The ids to remove.
	 * @returns The removed ids.
	 */
	private removeDictsFromGrid(toRemove: string[]): string[] {
		const ids: string[] = []

		for (const id of toRemove) {
			if (this.#idsToGridIndexes[id] !== undefined) {
				ids.push(id)

				this.removeFromGrid(`id == @${id}`)
				delete this.#idsToGridIndexes[id]
			}
		}

		return ids
	}

	/**
	 * Completely refresh the watch.
	 *
	 * ```typescript
	 * await watch.refresh()
	 * ```
	 */
	public async refresh(): Promise<void> {
		this.throwErrorIfClosed()

		await this.#subject.refresh()

		// Rebuild the grid using the ids we're interested in.
		this.clearGrid()

		const dictsToAdd: HDict[] = []

		for (const id of Object.keys(this.#idsToGridIndexes)) {
			const dict = this.#subject.get(id)
			if (dict) {
				// Always create a new copy so we can track local
				// changes to the watch's grid.
				dictsToAdd.push(dict.newCopy())
			}
		}

		if (dictsToAdd.length) {
			this.addToGrid(dictsToAdd)
		}
		this.rebuildDictCache()
		this.fire({ type: WatchEventType.Refreshed })
	}

	/**
	 * Rebuild the cache of dicts.
	 */
	private rebuildDictCache(): void {
		clear(this.#idsToGridIndexes)

		// Create a map of dicts for quick look up.
		for (let i = 0; i < this.grid.length; ++i) {
			const dict = this.grid.get(i) as HDict
			this.#idsToGridIndexes[getId(dict)] = i
		}
	}

	/**
	 * Changed event callback.
	 */
	private $onChanged = (event: WatchChangedEvent): void => {
		let ids: { [prop: string]: WatchChanged } | undefined

		for (const id in event.ids) {
			const index = this.#idsToGridIndexes[id]

			if (index !== undefined) {
				ids = ids ?? {}

				const ev = event.ids[id]
				ids[id] = ev
			}
		}

		if (ids) {
			this.updateGrid({
				idsToGridIndexes: this.#idsToGridIndexes,
				events: ids,
			})

			const event: WatchChangedEvent = {
				type: WatchEventType.Changed,
				ids,
			}

			this.fire(event)
		}
	}

	/**
	 * Clear all watched items from the watch.
	 *
	 * Please note, this will not close the watch or remove any
	 * associated method handlers.
	 *
	 * ```typescript
	 * await watch.clear()
	 * ```
	 */
	public async clear(): Promise<void> {
		this.remove(this.grid)
	}

	/**
	 * Close the watch.
	 *
	 * After this has been called, the underlying watch will be destroyed
	 * and will be no longer active. The watch is effectively 'dead' after this
	 * has been called.
	 *
	 * ```typescript
	 * // We must always close a watch once we've finished using it.
	 * await watch.close()
	 * ```
	 */
	public async close(): Promise<void> {
		try {
			if (this.isClosed()) {
				return
			}

			this.#closed = true
			await this.#subject.remove(Object.keys(this.#idsToGridIndexes))
		} finally {
			this.fire({ type: WatchEventType.Closed })
			this.clearGrid()
			clear(this.#idsToGridIndexes)
			this.clearCallbacks()
			watches.delete(this)
			this.computeSubjectPollRate()
		}
	}

	/**
	 * Returns the poll rate in seconds.
	 *
	 * ```typescript
	 * const pollRate = watch.pollRate
	 * ```
	 *
	 * @returns The poll rate for this watch.
	 */
	public get pollRate(): number {
		return this.#pollRate
	}

	/**
	 * Attempt to set a new poll rate in seconds for the watch.
	 *
	 * Please note, this value may be ignored.
	 *
	 * ```typescript
	 * // Set the poll rate to 10 seconds.
	 * watch.pollRate = 10
	 * ```
	 *
	 * @param pollRate The poll rate.
	 */
	public set pollRate(pollRate: number) {
		this.#pollRate = pollRate
		this.computeSubjectPollRate()
	}

	/**
	 * Add an event handler for the specified event type.
	 *
	 * This is used to listen for watch events.
	 *
	 * ```typescript
	 * watch.on(WatchEventType.Changed, (event: WatchEvent, emitter: WatchEventEmitter): void {
	 *  // Do something with the event!
	 * })
	 * ```
	 *
	 * @param eventType The event type to add the event for.
	 * @param callback The callback handler.
	 * @return The emitter instance.
	 * @throws An error if the watch is already closed.
	 */
	public on(eventType: WatchEventType, callback: WatchEventCallback): this {
		this.throwErrorIfClosed()

		let allCallbacks = this.#callbacks.get(eventType)

		if (!allCallbacks) {
			allCallbacks = new Set()
			this.#callbacks.set(eventType, allCallbacks)
		}

		allCallbacks.add(callback)
		return this
	}

	/**
	 * Remove an event handler from a watch.
	 *
	 * ```typescript
	 * watch.off(WatchEventType.Changed, cb)
	 * ```
	 *
	 * @param eventType event type to remove.
	 * @param callback callback to remove.
	 * @return The emitter instance.
	 */
	public off(eventType: WatchEventType, callback: WatchEventCallback): this {
		const allCallbacks = this.#callbacks.get(eventType)

		if (allCallbacks) {
			allCallbacks.delete(callback)

			if (!allCallbacks.size) {
				this.#callbacks.delete(eventType)
			}
		}

		return this
	}

	/**
	 * Fire an event callback.
	 *
	 * @param event The event object.
	 * @return The emitter instance.
	 */
	public fire(event: WatchEvent): this {
		this.#callbacks
			.get(event.type)
			?.forEach((callback: WatchEventCallback): void => {
				try {
					callback(event, this)
				} catch (err) {
					// We don't want errors to bubble up and effect other
					// callbacks so just log the.
					console.error(err)
				}
			})
		return this
	}

	/**
	 * Return the callbacks for the event type or all callbacks if
	 * the event type is not specified.
	 *
	 * ```typescript
	 * const anArrayOfCallbacks = watch.getCallbacks()
	 * ```
	 *
	 * @param eventType Optional event type.
	 * @returns The callbacks.
	 */
	public getCallbacks(eventType?: WatchEventType): WatchEventCallback[] {
		if (eventType) {
			return [...(this.#callbacks.get(eventType) ?? [])]
		} else {
			const callbacks = new Set<WatchEventCallback>()
			for (const cbs of this.#callbacks.values()) {
				for (const c of cbs) {
					callbacks.add(c)
				}
			}
			return [...callbacks]
		}
	}

	/**
	 * Return true if there are callback handlers for the specified event type.
	 *
	 * If there event type is not specified then check to see if there are any callback handlers.
	 *
	 * ```typescript
	 * if (watch.hasCallbacks()) {
	 *   // Do something...
	 * }
	 * ```
	 *
	 * @returns True if there are callbacks.
	 */
	public hasCallbacks(eventType?: WatchEventType): boolean {
		return (
			(eventType
				? this.#callbacks.get(eventType)?.size || 0
				: this.#callbacks.size) > 0
		)
	}

	/**
	 * Clear all callback event handlers on the watch.
	 *
	 * ```typescript
	 * // Clear all callbacks from the watch.
	 * watch.clearCallbacks()
	 * ```
	 *
	 * @return The emitter instance.
	 */
	public clearCallbacks(): this {
		this.#callbacks.clear()
		this.#subject.off(this.$onChanged)
		return this
	}

	/**
	 * Builds a changed callback handler based upon the parameters.
	 *
	 * Please note, the returned callback should be used to unregister the callback
	 * handler from the watch.
	 *
	 * ```typescript
	 * // Add event handlers. We're only interested in 'curVal' changes.
	 * watch.changed({
	 *   interests: ['curVal'],
	 *   callback: (event) => console.log(event)
	 * })
	 *
	 * ...
	 *
	 * // Add event handlers. We're only interested in changes to curVal when it's above
	 * // a certain value.
	 * watch.changed({
	 * 	interests: ['curVal'],
	 * 	condition: 'curVal > 50°F',
	 * 	callback: event => console.log(event),
	 * })
	 * ```
	 *
	 * @param options.interests Optional interests. This is a list of tags on a record
	 * the caller is interested. If specified, an event will only be fired if a record
	 * with one of these tags is changed, added or removed.
	 * @param options.condition Optional haystack filter condition used to filter a change
	 * before any callback is invoked.
	 * @param options.callback The callback.
	 * @returns The built callback handler.
	 * @throws An error if the haystack filter is invalid.
	 */
	public changed({
		interests,
		condition,
		callback,
	}: {
		interests?: string[]
		condition?: string
		callback: WatchEventCallback
	}): WatchEventCallback {
		// Pre-compile any haystack filter.
		const node: Node | undefined = condition
			? HFilter.parse(condition)
			: undefined

		// Build a callback to register.
		const cb = (event: WatchEvent, watch: Watch): void => {
			const changedEvent = event as WatchChangedEvent
			const newEvent: WatchChangedEvent = {
				type: changedEvent.type,
				ids: {},
			}

			// Filter tag interests.
			if (interests && interests.length > 0) {
				for (const id in changedEvent.ids) {
					const watchChanged = changedEvent.ids[id]
					const newWatchChanged: WatchChanged = {}

					if (watchChanged.changed) {
						const changed = watchChanged.changed.filter(
							(row: { name: string }): boolean =>
								interests.includes(row.name)
						)

						if (changed.length) {
							newWatchChanged.changed = changed
						}
					}

					if (watchChanged.added) {
						const added = watchChanged.added.filter(
							(row: { name: string }): boolean =>
								interests.includes(row.name)
						)

						if (added.length) {
							newWatchChanged.added = added
						}
					}

					if (watchChanged.removed) {
						const removed = watchChanged.removed.filter(
							(row: { name: string }): boolean =>
								interests.includes(row.name)
						)

						if (removed.length) {
							newWatchChanged.removed = removed
						}
					}

					if (
						newWatchChanged.changed ||
						newWatchChanged.added ||
						newWatchChanged.removed
					) {
						newEvent.ids[id] = newWatchChanged
					}
				}
			} else {
				newEvent.ids = { ...changedEvent.ids }
			}

			// Filter via a Haystack filter.
			if (node) {
				for (const id in newEvent.ids) {
					const index = this.#idsToGridIndexes[id]

					if (index !== undefined) {
						const dict = this.grid.get(index)
						if (!dict || !dict.matches(node)) {
							delete newEvent.ids[id]
						}
					}
				}
			}

			if (Object.keys(newEvent.ids).length > 0) {
				callback(newEvent, watch)
			}
		}

		this.on(WatchEventType.Changed, cb)
		return cb
	}

	/**
	 * Called to remove dicts from the watch's grid.
	 *
	 * This method can be overridden to track grid mutations.
	 *
	 * @param filter The filter to remove items by.
	 */
	public removeFromGrid(filter: string): void {
		this.grid.remove(filter)
	}

	/**
	 * Add the dicts to the watch's grid.
	 *
	 * This method can be overridden to track grid mutations.
	 *
	 * @param dicts The dicts to add to the grid.
	 */
	public addToGrid(dicts: HDict[]): void {
		this.grid.add(dicts)
	}

	/**
	 * Empty the grid.
	 *
	 * This method can be overridden to track grid mutations.
	 */
	public clearGrid(): void {
		this.grid.clear()
	}

	/**
	 * Update the grid with the new events information.
	 *
	 * @param options.dictIndexes An object with ids to indexes.
	 * @param options.events The events to update the grid with.
	 */
	public updateGrid({
		idsToGridIndexes,
		events,
	}: {
		idsToGridIndexes: { [prop: string]: number }
		events: { [prop: string]: WatchChanged }
	}): void {
		Watch.updateGrid(idsToGridIndexes, this.grid, events)
	}

	/**
	 * Update the grid with the new events.
	 *
	 * @param idsToGridIndexes A cache of ids to dict indexes in the grid.
	 * @param grid The grid to update.
	 * @param events The events to update the grid with.
	 */
	public static updateGrid(
		idsToGridIndexes: { [prop: string]: number },
		grid: HGrid,
		events: { [prop: string]: WatchChanged }
	): void {
		for (const id in events) {
			const ev = events[id]
			const index = idsToGridIndexes[id]

			if (index !== undefined) {
				const dict = grid.get(index)
				if (dict) {
					if (ev.added) {
						for (const obj of ev.added) {
							dict.set(obj.name, obj.value.newCopy())
						}
					}

					if (ev.changed) {
						for (const obj of ev.changed) {
							dict.set(obj.name, obj.value.newCopy())
						}
					}

					if (ev.removed) {
						for (const obj of ev.removed) {
							dict.remove(obj.name)
						}
					}
				}
			}
		}
	}

	/**
	 * Compute a new poll rate from all the open watches.
	 */
	private computeSubjectPollRate(): void {
		const pollRate = Watch.watches.length
			? Watch.watches.reduce(
					(acc: number, watch: Watch): number =>
						acc < watch.pollRate ? acc : watch.pollRate,
					Number.MAX_SAFE_INTEGER
			  )
			: DEFAULT_POLL_RATE_SECS

		this.#subject.pollRate =
			pollRate <= 0 ? DEFAULT_POLL_RATE_SECS : pollRate
	}
}
