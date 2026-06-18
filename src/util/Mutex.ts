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
 * For a critical section that spans multiple awaited steps, use the `using`
 * keyword so the lock is released automatically when the block exits:
 *
 * ```typescript
 * using release = await mutex.acquire()
 * if (someState) {
 *   await longRunningNetworkCall()
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
	 * The returned handle also implements `Disposable` so it can be used with
	 * the `using` keyword:
	 *
	 * ```typescript
	 * using release = await mutex.acquire()
	 * // lock is automatically released when the block exits
	 * ```
	 *
	 * @returns A release handle that is callable and implements `Disposable`.
	 */
	async acquire(): Promise<(() => void) & Disposable> {
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
	 * Create a one shot release handle for the currently held lock.
	 *
	 * The handle is callable (`release()`) and also implements `Disposable`
	 * (`release[Symbol.dispose]()`) so it works with the `using` keyword.
	 *
	 * @returns The release handle.
	 */
	private createRelease(): (() => void) & Disposable {
		let released = false

		const release = (): void => {
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

		release[Symbol.dispose] = release

		return release
	}

	/**
	 * Run a task exclusively and sequentially.
	 *
	 * @param task The task to run.
	 * @return A Promise that resolves to a result.
	 */
	async runSequential<T>(task: () => Promise<T>): Promise<T> {
		using _release = await this.acquire()
		return await task()
	}

	/**
	 * Wait for all outstanding tasks to complete.
	 */
	async wait(): Promise<void> {
		// Queue behind all outstanding work then release immediately. Since the
		// lock is acquired in FIFO order, this resolves only once every task
		// queued beforehand has completed.
		using _release = await this.acquire()
	}

	/**
	 * @returns True if the mutex has outstanding tasks running.
	 */
	isLocked(): boolean {
		return this.#locked
	}
}
