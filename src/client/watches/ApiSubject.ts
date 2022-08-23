/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HGrid, HDict, HRef } from 'haystack-core'
import { WatchApis } from './WatchApis'
import { isGridError } from '../GridError'
import { getId } from '../../util/hval'
import { WatchEventType, WatchChanged, WatchChangedEvent } from './WatchEvent'
import { Subject, SubjectChangedEventHandler } from './Subject'
import { Mutex } from '../../util/Mutex'
import { clear } from '../../util/obj'
import { ClientServiceConfig } from '../ClientServiceConfig'
import { Record as RecordDict } from '../../util/Record'

interface DictCount {
	dict: HDict
	count: number
}

/**
 * A linger timeout in milliseconds.
 *
 * If a watch doesn't have any data to watch, a delay is made
 * before the watch is closed.
 */
export const LINGER_TIMEOUT_MS = 10000

/**
 * A watch subject that uses a mutex to ensure all network calls
 * are mutally exclusive and sequential.
 */
export class ApiSubject implements Subject {
	/**
	 * A reference to the watch operations.
	 */
	readonly #apis: WatchApis

	/**
	 * Service configuration.
	 */
	readonly #serviceConfig: ClientServiceConfig

	/**
	 * The watch's poll rate.
	 */
	#pollRate: number

	/**
	 * The timer id used for polling.
	 */
	#pollTimerId?: NodeJS.Timeout

	/**
	 * The timer id to linger a watch before it's closed.
	 */
	#lingerTimerId?: NodeJS.Timeout

	/**
	 * Flag indicating whether the watch is open.
	 */
	#open = false

	/**
	 * The grid for the watch.
	 */
	#grid?: HGrid<RecordDict>

	/**
	 * The server watch id.
	 */
	#id = ''

	/**
	 * A cache of ids to dicts and their reference count.
	 *
	 * The reference count is used to keep track of how many adds and removes
	 * there are for a particular record.
	 */
	readonly #dictCache: { [prop: string]: DictCount } = {}

	/**
	 * Watch event emitter.
	 */
	readonly #callbacks = new Set<SubjectChangedEventHandler>()

	/**
	 * A mutex used to ensure opening, closing, adding and removing operations
	 * remain mutually exclusive and sequential.
	 *
	 * This has been added so multiple Watches can be created/changed
	 * in parallel without any performance issues. For example, let's say two
	 * watches are created at the same time. We need to ensure the server side watch
	 * is only opened once and any records requested from both watches aren't ask for
	 * multiple times through network requests.
	 */
	readonly #mutex = new Mutex()

	/**
	 * Construct a new watch API subject.
	 *
	 * @param apis The watch APIs.
	 * @param serviceConfig The service configuration.
	 * @param pollRate The poll rate.
	 */
	public constructor(
		apis: WatchApis,
		serviceConfig: ClientServiceConfig,
		pollRate: number
	) {
		this.#apis = apis
		this.#serviceConfig = serviceConfig
		this.#pollRate = pollRate
	}

	/**
	 * @returns The watch's grid instance.
	 */
	public get grid(): HGrid {
		if (!this.#grid) {
			this.#grid = HGrid.make({})
		}
		return this.#grid
	}

	/**
	 * @returns The display name for the subject.
	 */
	public get display(): string {
		const watchId = this.watchId ?? '-'
		return `${watchId} @ ${this.#serviceConfig.getOpUrl('')}`
	}

	/**
	 * @returns The watch id.
	 */
	public get watchId(): string {
		return this.#id
	}

	/**
	 * @returns True if the watch is currently open.
	 */
	public isOpen(): boolean {
		return this.#open
	}

	/**
	 * Add records to observe.
	 *
	 * @param ids The ids to add.
	 */
	public async add(ids: string[]): Promise<void> {
		await this.#mutex.wait()
		await (this.isOpen() ? this.addIds(ids) : this.open(ids))
	}

	/**
	 * Add the ids.
	 *
	 * @param ids The ids to add.
	 */
	private async addIds(ids: string[]): Promise<void> {
		return this.#mutex.runSequential(async (): Promise<void> => {
			try {
				this.stopLingerTimer()

				// Only add dicts to the server that aren't already added.
				const toAddToServer = new Set<string>()

				// Keep track of what is not being added to the server
				// to keep track of the reference count.
				const notToAddToServer: string[] = []

				for (const id of ids) {
					if (!this.#dictCache[id] && !toAddToServer.has(id)) {
						toAddToServer.add(id)
					} else {
						notToAddToServer.push(id)
					}
				}

				if (toAddToServer.size > 0) {
					const addedToServer = await this.#apis.add(this.watchId, [
						...toAddToServer,
					])

					this.addDictsToGrid(addedToServer)
				}

				this.incrementDictsCount(notToAddToServer)
			} finally {
				if (this.grid.isEmpty()) {
					this.restartLingerTimer()
				}
			}
		})
	}

	/**
	 * Add the dicts to the subject's grid.
	 *
	 * @param toAdd The dicts to add.
	 */
	private addDictsToGrid(toAdd: HDict[]): void {
		for (const dict of toAdd) {
			if (!dict.isEmpty()) {
				const id = getId(dict)

				if (!this.#dictCache[id]) {
					this.grid.add(dict)
					this.#dictCache[id] = { count: 1, dict }
				}
			}
		}
	}

	/**
	 * Increment the dict reference count.
	 *
	 * @param toAdd The dicts to have their reference count incremented.
	 */
	private incrementDictsCount(toAdd: string[]): void {
		for (const id of toAdd) {
			const dictCount = this.#dictCache[id]
			if (dictCount) {
				++dictCount.count
			}
		}
	}

	/**
	 * Open a new watch.
	 *
	 * @param ids The ids to watch.
	 * @returns The grid from the watch open response.
	 */
	private async open(ids: string[]): Promise<HGrid> {
		return this.#mutex.runSequential(async (): Promise<HGrid> => {
			try {
				this.stopLingerTimer()

				const openIds: string[] = []
				const counts: Record<string, number> = {}

				for (const id of ids) {
					if (!counts[id]) {
						openIds.push(id)
						counts[id] = 1
					} else {
						++counts[id]
					}
				}

				// Keep track of the promise to open a watch so we don't have
				// clashes between a watch trying to open and close at the same time.
				const { id, records } = await this.#apis.open(openIds)

				this.#id = id

				this.#grid = HGrid.make({
					meta: HDict.make({ watchId: id }),
					rows: records,
				})

				this.#open = true

				// Create a map of dicts for quick look up.
				clear(this.#dictCache)

				for (const dict of this.grid) {
					const id = getId(dict)
					this.#dictCache[id] = { count: counts[id] || 1, dict }
				}

				this.restartPollTimer()
			} finally {
				// If the grid is empty then wait for it to be added to otherwise
				// close it.
				if (this.grid.isEmpty()) {
					this.restartLingerTimer()
				}
			}
			return this.#grid
		})
	}

	/**
	 * Attempt to reopen a watch.
	 */
	private async reopen(): Promise<void> {
		await this.#mutex.wait()
		const open = this.isOpen()

		let ids: string[] | undefined
		if (open) {
			ids = Object.keys(this.#dictCache)
		}

		// Attempt a close first and ignore any errors.
		try {
			await this.close()
		} catch (ignore) {}

		if (open && ids) {
			// Open with original arguments.
			await this.open(ids)
		}
	}

	/**
	 * Remove records to watch.
	 *
	 * This is called to stop watching records.
	 *
	 * @param ids The ids to remove.
	 */
	public async remove(ids: string[]): Promise<void> {
		await this.#mutex.runSequential(async (): Promise<void> => {
			try {
				if (!this.isOpen()) {
					return
				}

				const toRemoveFromServer: string[] = []

				for (const id of ids) {
					if (this.decrementAndRemoveDictFromGrid(id)) {
						toRemoveFromServer.push(id)
					}
				}

				if (toRemoveFromServer.length) {
					await this.#apis.remove(this.watchId, toRemoveFromServer)
				}
			} finally {
				// If there's nothing left to watch then start the linger.
				if (this.grid.isEmpty()) {
					this.restartLingerTimer()
				}
			}
		})
	}

	/**
	 * Decrement and possible remove an id from a watch's grid.
	 *
	 * @param id The id to remove
	 * @returns True if the id has been removed.
	 */
	private decrementAndRemoveDictFromGrid(id: string): boolean {
		const dictCount = this.#dictCache[id]
		if (dictCount && --dictCount.count <= 0) {
			this.grid.remove(`id == @${id}`)
			delete this.#dictCache[id]
			return true
		} else {
			return false
		}
	}

	/**
	 * Register a callback for changed events.
	 *
	 * @param callback The callback used for changed events.
	 */
	public on(callback: SubjectChangedEventHandler): void {
		this.#callbacks.add(callback)
	}

	/**
	 * Unregister the callback for changed events.
	 *
	 * @param callback The callback used for changed events.
	 */
	public off(callback: SubjectChangedEventHandler): void {
		this.#callbacks.delete(callback)
	}

	/**
	 * Poll the watch and update the watch's grid.
	 */
	public async poll(): Promise<void> {
		try {
			const watchId = this.watchId
			if (!watchId) {
				return
			}

			// Only generate any events if there are registered callbacks.
			const generateEvent = this.#callbacks.size > 0

			let event: WatchChangedEvent | undefined
			const updates = await this.#apis.poll(watchId)

			for (const newDict of updates) {
				const curDict = this.#dictCache[getId(newDict)]?.dict
				if (curDict) {
					const changes = ApiSubject.updateDict(
						curDict,
						newDict,
						generateEvent
					)

					if (changes) {
						event = event ?? {
							type: WatchEventType.Changed,
							ids: {},
						}

						event.ids[getId(curDict)] = changes
					}
				}
			}

			// Only fire an event if there are any changes detected.
			if (event) {
				for (const callback of this.#callbacks) {
					try {
						callback(event)
					} catch (err) {
						console.error(err)
					}
				}
			}
		} catch (err) {
			if (isGridError(err)) {
				await this.reopen()
			} else {
				throw err
			}
		} finally {
			await this.#mutex.wait()
			if (this.isOpen()) {
				this.restartPollTimer()
			}
		}
	}

	/**
	 * Update an existing dict with the new dict and return the changes
	 * or undefined if none are detected.
	 *
	 * @param curDict The dict to be updated.
	 * @param newDict The new dict.
	 * @param generateEvent If true then event information will be generated as
	 * the dicts are updated.
	 * @returns The changes detected or undefined for no changes.
	 */
	private static updateDict(
		curDict: HDict,
		newDict: HDict,
		generateEvent: boolean
	): WatchChanged | undefined {
		const keys = new Set<string>()

		// Combine all the keys from both dicts so we can iterate
		// and figure out what's been removed, added and changed.
		const curObj = curDict.toObj()
		for (const key in curObj) {
			keys.add(key)
		}

		const newObj = newDict.toObj()
		for (const key in newObj) {
			keys.add(key)
		}

		let changes: WatchChanged | undefined

		for (const key of keys) {
			const newVal = newObj[key]
			const curVal = curObj[key]

			if (newVal && !curVal) {
				if (generateEvent) {
					// Added
					changes = changes ?? {}
					changes.added = changes.added ?? []
					changes.added.push({ name: key, value: newVal.newCopy() })
				}

				curDict.set(key, newVal)
			} else if (!newVal && curVal) {
				if (generateEvent) {
					// Removed
					changes = changes ?? {}
					changes.removed = changes.removed ?? []
					changes.removed.push({ name: key, value: curVal.newCopy() })
				}

				curDict.remove(key)
			} else if (newVal && curVal && !newVal.equals(curVal)) {
				// Changed
				if (generateEvent) {
					changes = changes ?? {}
					changes.changed = changes.changed ?? []
					changes.changed.push({
						name: key,
						oldValue: curVal.newCopy(),
						value: newVal.newCopy(),
					})
				}

				curDict.set(key, newVal)
			}
		}

		return changes
	}

	/**
	 * Completely refresh the watch.
	 */
	public async refresh(): Promise<void> {
		try {
			this.stopLingerTimer()

			await this.#mutex.wait()
			if (!this.isOpen()) {
				return
			}

			try {
				const records = await this.#apis.refresh(this.watchId)

				this.#grid = HGrid.make({
					meta: HDict.make({ watchId: this.#id }),
					rows: records,
				})

				// Restart the poll timer as we've just done a refresh.
				await this.#mutex.wait()
				if (this.isOpen()) {
					this.restartPollTimer()
				}

				// Update the dict references in the cache.
				for (const dict of this.#grid) {
					const id = getId(dict)
					const dictCount = this.#dictCache[id]
					if (dictCount) {
						dictCount.dict = dict
					}
				}
			} catch (err) {
				if (isGridError(err)) {
					await this.reopen()
				} else {
					throw err
				}
			}
		} finally {
			if (this.grid.isEmpty()) {
				this.restartLingerTimer()
			}
		}
	}

	/**
	 * Close the watch.
	 */
	private async close(): Promise<void> {
		return this.#mutex.runSequential(async (): Promise<void> => {
			const open = this.isOpen()
			this.#open = false

			this.stopPollTimer()
			this.stopLingerTimer()

			try {
				if (open) {
					await this.#apis.close(this.watchId)
				}
			} finally {
				clear(this.#dictCache)
				this.grid.meta.clear()
				this.grid.clear()
			}
		})
	}

	/**
	 * Close the server side watch if nothing is being observed.
	 */
	public checkClose = async (): Promise<void> => {
		try {
			await this.#mutex.wait()

			if (this.grid.isEmpty()) {
				await this.close()
			}
		} catch (error) {
			console.error(error)
		}
	}

	/**
	 * Return a record via its id or undefined if it can't be found.
	 *
	 * @param id The id to record to get.
	 * @returns The dict or undefined if it can't be found.
	 */
	public get(id: string | HRef): HDict | undefined {
		return this.#dictCache[HRef.make(id).value]?.dict
	}

	/**
	 * @returns The subject's poll rate.
	 */
	public get pollRate(): number {
		return this.#pollRate
	}

	/**
	 * Set a poll rate.
	 *
	 * @param pollRate The new poll rate.
	 */
	public set pollRate(pollRate: number) {
		const oldPollRate = this.#pollRate
		this.#pollRate = pollRate

		// Only restart the poll rate if the watch is open and different.
		if (this.isOpen() && oldPollRate !== pollRate) {
			this.restartPollTimer()
		}
	}

	/**
	 * Inspect the subject.
	 */
	public inspect(): void {
		this.grid.inspect(`Subject ${this.watchId}`)
	}

	/**
	 * Restart the watch's poll timer.
	 */
	private restartPollTimer(): void {
		this.stopPollTimer()

		this.#pollTimerId = setTimeout(async () => {
			try {
				await this.poll()
			} catch (error) {
				console.error(error)
			}
		}, this.#pollRate * 1000)
	}

	/**
	 * Stop the watch's poll timer.
	 */
	private stopPollTimer(): void {
		if (this.#pollTimerId) {
			clearTimeout(this.#pollTimerId)
			this.#pollTimerId = undefined
		}
	}

	/**
	 * Restart the watch's linger timer.
	 *
	 * If a watch is empty then a linger will wait a period of
	 * time before shutting down the server side watch.
	 */
	private restartLingerTimer(): void {
		this.stopLingerTimer()
		this.#lingerTimerId = setTimeout(this.checkClose, LINGER_TIMEOUT_MS)
	}

	/**
	 * Stop the watch's linger timer.
	 */
	private stopLingerTimer(): void {
		if (this.#lingerTimerId) {
			clearTimeout(this.#lingerTimerId)
			this.#lingerTimerId = undefined
		}
	}
}
