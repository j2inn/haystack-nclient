/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

/**
 * A mutex object to prevent concurrent access of
 * long running asynchronous calls.
 *
 * Tasks acquire the lock in strict first-in first-out (FIFO) order.
 *
 * The simplest way to use a mutex is to wrap a single task:
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
 *
 * For a critical section that spans multiple awaited steps, acquire the
 * lock manually so it's held for the whole section and release it when
 * done:
 *
 * ```typescript
 * const release = await mutex.acquire()
 * try {
 *   if (someState) {
 *     await longRunningNetworkCall()
 *   }
 * } finally {
 *   release()
 * }
 * ```
 */
export class Mutex {
	/**
	 * The FIFO queue of waiters waiting to acquire the lock.
	 */
	readonly #queue: (() => void)[] = []

	/**
	 * Flag indicating whether the lock is currently held.
	 */
	#locked = false

	/**
	 * Acquire the lock.
	 *
	 * Resolves with a `release` function once the lock is held. The caller
	 * must invoke `release` exactly once to free the lock. Calling `release`
	 * more than once is a no-op.
	 *
	 * @returns A function used to release the lock.
	 */
	async acquire(): Promise<() => void> {
		// If the lock is already held then wait in the FIFO queue for our turn.
		if (this.#locked) {
			await new Promise<void>((resolve): void => {
				this.#queue.push(resolve)
			})
		}

		this.#locked = true

		return this.createRelease()
	}

	/**
	 * Create a one shot release function for the currently held lock.
	 *
	 * @returns The release function.
	 */
	private createRelease(): () => void {
		let released = false

		return (): void => {
			if (released) {
				return
			}
			released = true

			// Hand the lock directly to the next waiter so the lock stays held
			// for the whole hand off. This guarantees FIFO ordering and ensures
			// the lock never briefly becomes free between queued tasks.
			const next = this.#queue.shift()
			if (next) {
				next()
			} else {
				this.#locked = false
			}
		}
	}

	/**
	 * Run a task exclusively and sequentially.
	 *
	 * @param task The task to run.
	 * @return A Promise that resolves to a result.
	 */
	async runSequential<T>(task: () => Promise<T>): Promise<T> {
		const release = await this.acquire()

		try {
			return await task()
		} finally {
			release()
		}
	}

	/**
	 * Wait for all outstanding tasks to complete.
	 */
	async wait(): Promise<void> {
		// Queue behind all outstanding work then release immediately. Since the
		// lock is acquired in FIFO order, this resolves only once every task
		// queued beforehand has completed.
		const release = await this.acquire()
		release()
	}

	/**
	 * @returns True if the mutex has outstanding tasks running.
	 */
	isLocked(): boolean {
		return this.#locked
	}
}
