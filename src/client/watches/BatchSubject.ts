/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HRef, HDict } from 'haystack-core'
import { Subject, SubjectChangedEventHandler } from './Subject'
import { makeDeferred, Deferred } from '../../util/promise'

/**
 * The wait period used as a window between method invocations.
 *
 * During this time, operations will be batched together.
 */
const BATCH_WINDOW_MS = 0

enum OpType {
	add = 'add',
	remove = 'remove',
}

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
	 * The timer used for batching operations.
	 */
	#batchTimer?: NodeJS.Timeout

	/**
	 * The queued batched ops.
	 */
	#batchQueue: { op: string; ids: string[]; deferred: Deferred }[] = []

	/**
	 * Constructs a new batch subject.
	 *
	 * @param subject The subject to wrap.
	 */
	public constructor(subject: Subject) {
		this.#subject = subject
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
		return this.batchInvoke(OpType.add, ids)
	}

	/**
	 * Remove records from the subject.
	 *
	 * This is called to stop observing records.
	 *
	 * @param ids The ids to remove.
	 */
	public async remove(ids: string[]): Promise<void> {
		return this.batchInvoke(OpType.remove, ids)
	}

	/**
	 * Invoke a batch operation.
	 *
	 * @param op The name of the op.
	 * @param ids The ids used in the batch operation.
	 */
	private async batchInvoke(op: string, ids: string[]): Promise<void> {
		const deferred = makeDeferred()

		this.queueBatchOp(op, ids, deferred)
		this.clearBatchTimer()
		this.startBatchTimer()

		return deferred.promise
	}

	/**
	 * Queue the batch operation to be invoked.
	 *
	 * @param op The name of the op.
	 * @param ids The ids used in the batch operation.
	 * @param deferred The deferred promise for this asynchronous operation.
	 */
	private queueBatchOp(op: string, ids: string[], deferred: Deferred): void {
		const lastOp = this.#batchQueue[this.#batchQueue.length - 1]

		// If the last op was the same as this then coalesce the request.
		if (lastOp?.op === op) {
			for (const id of ids) {
				if (!lastOp.ids.includes(id)) {
					lastOp.ids.push(id)
				}
			}

			// Chain the new promise onto the existing one so it executes in sequence.
			lastOp.deferred.promise.then(deferred.resolve, deferred.reject)
		} else {
			// Add a new op if it doesn't exist.
			this.#batchQueue.push({ op, ids: [...ids], deferred })
		}
	}

	/**
	 * Clear the existing batch timer.
	 */
	private clearBatchTimer(): void {
		if (this.#batchTimer) {
			clearTimeout(this.#batchTimer)
			this.#batchTimer = undefined
		}
	}

	/**
	 * Start a new batch timer.
	 */
	private startBatchTimer(): void {
		this.#batchTimer = setTimeout(async (): Promise<void> => {
			try {
				const batchedOps = this.#batchQueue
				this.#batchQueue = []

				for (const batchedOp of batchedOps) {
					switch (batchedOp.op) {
						case OpType.add:
							await this.#subject
								.add(batchedOp.ids)
								.then(
									batchedOp.deferred.resolve,
									batchedOp.deferred.reject
								)
							break
						case OpType.remove:
							await this.#subject
								.remove(batchedOp.ids)
								.then(
									batchedOp.deferred.resolve,
									batchedOp.deferred.reject
								)
							break
						default:
							console.error(`Invalid op: ${batchedOp.op}`)
					}
				}
			} catch (error) {
				console.error('Watch batch subject error', error)
			}
		}, BATCH_WINDOW_MS)
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
