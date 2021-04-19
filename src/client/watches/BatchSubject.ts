/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HRef, HDict } from 'haystack-core'
import { Subject, SubjectChangedEventHandler } from './Subject'
import { BatchIds } from '../../util/BatchIds'

/**
 * A watch subject that batches calls together.
 *
 * This is used to batch calls together. For instance, let's say 10 watches
 * simulatenously watch some records. It would be good to batch this up into one network call.
 */
export class BatchSubject implements Subject {
	/**
	 * The inner subject.
	 */
	readonly #subject: Subject

	/**
	 * Batch up calls to add.
	 */
	readonly #batchAdd: BatchIds

	/**
	 * Batch up calls to remove.
	 */
	readonly #batchRemove: BatchIds

	/**
	 * Constructs a new batch subject.
	 *
	 * @param subject The subject to wrap.
	 */
	public constructor(subject: Subject) {
		this.#subject = subject

		this.#batchAdd = new BatchIds(
			async (ids: string[]): Promise<void> => {
				return this.#subject.add(ids)
			}
		)

		this.#batchRemove = new BatchIds(
			async (ids: string[]): Promise<void> => {
				return this.#subject.remove(ids)
			}
		)
	}

	/**
	 * @returns The display name of the subject.
	 */
	public get display(): string {
		return this.#subject.display
	}

	/**
	 * @returns The subject's poll rate.
	 */
	public get pollRate(): number {
		return this.#subject.pollRate
	}

	/**
	 * Set the poll rate.
	 *
	 * @param pollRate
	 */
	public set pollRate(pollRate: number) {
		this.#subject.pollRate = pollRate
	}

	/**
	 * Refresh the subject's data.
	 */
	public async refresh(): Promise<void> {
		await this.#subject.refresh()
	}

	/**
	 * Add records to observe.
	 *
	 * @param ids The ids to add.
	 */
	public async add(ids: string[]): Promise<void> {
		return this.#batchAdd.invoke(ids)
	}

	/**
	 * Remove records from the subject.
	 *
	 * This is called to stop observing records.
	 *
	 * @param ids The ids to remove.
	 */
	public async remove(ids: string[]): Promise<void> {
		await this.#batchRemove.invoke(ids)
	}

	/**
	 * Register a callback for changed events.
	 *
	 * @param callback The callback used for changed events.
	 */
	public on(callback: SubjectChangedEventHandler): void {
		this.#subject.on(callback)
	}

	/**
	 * Unregister the callback for changed events.
	 *
	 * @param callback The callback used for changed events.
	 */
	public off(callback: SubjectChangedEventHandler): void {
		this.#subject.off(callback)
	}

	/**
	 * Return a record via its id or undefined if it can't be found.
	 *
	 * @param id The id to record to get.
	 * @returns The dict or undefined if it can't be found.
	 */
	public get(id: string | HRef): HDict | undefined {
		return this.#subject.get(id)
	}

	/**
	 * Inspect the subject.
	 */
	public inspect(): void {
		this.#subject.inspect()
	}
}
