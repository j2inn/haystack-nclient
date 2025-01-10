/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

/**
 * A mutex object to prevent concurrent access of
 * long running asynchronous calls.
 *
 * ```typescript
 * const mutex = new Mutex()
 *
 * mutex.runSequential(async (): Promise<void> => {
 *   if (await longRunningNetworkCall()) {
 *     // Do something...
 *    }
 * })
 * ```
 */
export class Mutex {
	/**
	 * The cached promise.
	 */
	#promise?: Promise<unknown>

	/**
	 * Run a task exclusively and sequentially.
	 *
	 * @param task The task to run.
	 * @return A Promise that resolves to a result.
	 */
	async runSequential<T>(task: () => Promise<T>): Promise<T> {
		// Wait for the tasks to complete.
		// This method has to be kept inline and hence duplicated from #wait().
		while (this.#promise) {
			try {
				await this.#promise
			} catch {}
		}

		try {
			return await (this.#promise = task())
		} finally {
			this.#promise = undefined
		}
	}

	/**
	 * Wait for all tasks to complete.
	 */
	async wait(): Promise<void> {
		while (this.#promise) {
			try {
				await this.#promise
			} catch {}
		}
	}

	/**
	 * @returns True if the mutex has outstanding tasks running.
	 */
	isLocked(): boolean {
		return !!this.#promise
	}
}
