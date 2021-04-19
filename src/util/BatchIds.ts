import { makeDeferred, Deferred } from './promise'

/**
 * The wait period used as a window between method invocations.
 *
 * During this time, operations will be batched together.
 */
const BATCH_WINDOW_MS = 0

/**
 * An asynchronous operation that takes a number of ids.
 */
interface IdsMethod {
	(ids: string[]): Promise<void>
}

/**
 * An object that batches asynchronous method invocations with ids argument.
 */
export class BatchIds {
	/**
	 * The timer used for batching operations.
	 */
	#timer?: NodeJS.Timeout
	/**
	 * The ids for the operation.
	 */
	#ids?: string[]
	/**
	 * The batch promise to use.
	 */
	#deferred?: Deferred
	/**
	 * The operation to invoke with batch ids.
	 */
	readonly #method: IdsMethod

	/**
	 * Constructs a new batch id object.
	 *
	 * @param method The method to batch.
	 */
	public constructor(method: IdsMethod) {
		this.#method = method
	}
	/**
	 * Invoke the operation to be batched.
	 *
	 * @param ids The ids for the argument.
	 */
	public async invoke(ids: string[]): Promise<void> {
		// Stop any timer currently running.
		this.stopInvocationTimer()

		// Make a note of the ids.
		this.mergeIds(ids)

		if (!this.#deferred) {
			this.#deferred = makeDeferred()
		}

		// Restart the timer that will at some point resolve the deferred promise.
		this.startInvocationTimer()

		return this.#deferred.promise
	}
	/**
	 * Merge the ids together.
	 *
	 * @param newIds The new ids to merge.
	 */
	private mergeIds(newIds: string[]): void {
		if (!this.#ids) {
			this.#ids = newIds
		} else {
			for (const id of newIds) {
				if (!this.#ids.includes(id)) {
					this.#ids.push(id)
				}
			}
		}
	}
	/**
	 * Start the timer to invoke the batched method.
	 */
	private startInvocationTimer(): void {
		this.#timer = setTimeout(async (): Promise<void> => {
			const deferred = this.#deferred
			try {
				if (this.#ids) {
					await this.#method(this.#ids)
				}

				// Reset any arguments before resolve the problem. Do this just incase
				// resolving this promise causes any additional batching!
				this.reset()
				if (deferred && deferred.resolve) {
					deferred.resolve()
				}
			} catch (err) {
				this.reset()
				if (deferred && deferred.reject) {
					deferred.reject(err)
				}
			}
		}, BATCH_WINDOW_MS)
	}
	/**
	 * Stop the current invocation timer.
	 */
	private stopInvocationTimer(): void {
		if (this.#timer) {
			clearTimeout(this.#timer)
			this.#timer = undefined
		}
	}
	/**
	 * Reset all information used for invoking a batch operation.
	 */
	private reset(): void {
		this.#deferred = undefined
		this.#timer = undefined
		this.#ids = undefined
	}
}
