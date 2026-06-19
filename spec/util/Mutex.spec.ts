/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { Mutex } from '../../src/util/Mutex'

const delay = async (interval: number): Promise<void> => {
	return new Promise((resolve: () => void): void => {
		setTimeout(resolve, interval)
	})
}

describe('Mutex', function (): void {
	let mutex: Mutex
	let state: boolean
	let counter: number

	async function foo(): Promise<number> {
		if (state) {
			counter++
		}

		// Simulates a long running network call.
		await delay(20)

		// Change this flag after the long running network call. Now
		// other calls should be able to increment the counter.
		state = true

		return counter
	}

	beforeEach(function (): void {
		mutex = new Mutex()
		state = false
		counter = 0
	})

	describe('#runSequential()', function (): void {
		it('runs tasks exclusively in sequential order', async function (): Promise<void> {
			// Running everything at once should still run it in order.
			const result = await Promise.all([
				mutex.runSequential(foo),
				mutex.runSequential(foo),
				mutex.runSequential(foo),
				mutex.runSequential(foo),
			])

			expect(result).toEqual([0, 1, 2, 3])
		})

		it('preserves FIFO order regardless of task duration', async function (): Promise<void> {
			const order: number[] = []

			const task = (id: number, ms: number): (() => Promise<void>) => {
				return async (): Promise<void> => {
					await delay(ms)
					order.push(id)
				}
			}

			// The first queued task is the slowest. FIFO ordering must still
			// be honoured even though later tasks would finish sooner if run
			// concurrently.
			await Promise.all([
				mutex.runSequential(task(0, 30)),
				mutex.runSequential(task(1, 5)),
				mutex.runSequential(task(2, 5)),
			])

			expect(order).toEqual([0, 1, 2])
		})

		it('isolates errors so later tasks still run in order', async function (): Promise<void> {
			const order: number[] = []

			const results = await Promise.allSettled([
				mutex.runSequential(async (): Promise<void> => {
					order.push(0)
					throw new Error('boom')
				}),
				mutex.runSequential(async (): Promise<void> => {
					order.push(1)
				}),
			])

			expect(order).toEqual([0, 1])
			expect(results[0].status).toBe('rejected')
			expect(results[1].status).toBe('fulfilled')
			expect(mutex.isLocked()).toBe(false)
		})
	}) // #runSequential()

	describe('#acquire()', function (): void {
		it('grants the lock to one caller at a time in FIFO order', async function (): Promise<void> {
			const order: number[] = []

			const first = await mutex.acquire()
			expect(mutex.isLocked()).toBe(true)

			// These two queue behind the held lock.
			const second = mutex.acquire().then((release): void => {
				order.push(2)
				release()
			})
			const third = mutex.acquire().then((release): void => {
				order.push(3)
				release()
			})

			order.push(1)
			first()

			await Promise.all([second, third])

			expect(order).toEqual([1, 2, 3])
			expect(mutex.isLocked()).toBe(false)
		})

		it('releases the lock even when the critical section throws', async function (): Promise<void> {
			let secondRan = false

			const criticalSection = async (): Promise<void> => {
				const release = await mutex.acquire()
				try {
					throw new Error('critical section error')
				} finally {
					release()
				}
			}

			// The second acquire should be unblocked despite the first throwing.
			const second = mutex.acquire().then((release): void => {
				secondRan = true
				release()
			})

			await expect(criticalSection()).rejects.toThrow(
				'critical section error'
			)
			await second

			expect(secondRan).toBe(true)
			expect(mutex.isLocked()).toBe(false)
		})

		it('treats releasing more than once as a no-op', async function (): Promise<void> {
			const release = await mutex.acquire()
			release()
			expect(mutex.isLocked()).toBe(false)

			// A second caller now holds the lock.
			const second = await mutex.acquire()
			expect(mutex.isLocked()).toBe(true)

			// Releasing the stale first handle must not free the second's lock.
			release()
			expect(mutex.isLocked()).toBe(true)

			second()
			expect(mutex.isLocked()).toBe(false)
		})
	}) // #acquire()

	describe('#wait()', function (): void {
		it('waits for all outstanding tasks to complete', async function (): Promise<void> {
			mutex.runSequential(foo)
			mutex.runSequential(foo)
			mutex.runSequential(foo)
			mutex.runSequential(foo)

			expect(counter).toEqual(0)
			expect(mutex.isLocked()).toEqual(true)
			await mutex.wait()
			expect(mutex.isLocked()).toEqual(false)
			expect(counter).toEqual(3)
		})

		it('does not return before queued tasks have run', async function (): Promise<void> {
			let ran = false

			mutex.runSequential(async (): Promise<void> => {
				await delay(20)
				ran = true
			})

			await mutex.wait()
			expect(ran).toBe(true)
		})

		it('resolves immediately when the mutex is not locked', async function (): Promise<void> {
			expect(mutex.isLocked()).toBe(false)
			await mutex.wait()
			expect(mutex.isLocked()).toBe(false)
		})

		it('all concurrent wait calls resolve once outstanding work drains', async function (): Promise<void> {
			let ran = false

			mutex.runSequential(async (): Promise<void> => {
				await delay(20)
				ran = true
			})

			// Three independent callers all waiting at the same time.
			await Promise.all([mutex.wait(), mutex.wait(), mutex.wait()])

			expect(ran).toBe(true)
			expect(mutex.isLocked()).toBe(false)
		})
	}) // #wait()

	describe('#isLocked()', function (): void {
		it('returns true when locked', async function (): Promise<void> {
			mutex.runSequential(foo)
			expect(mutex.isLocked()).toEqual(true)
		})

		it('returns false when unlocked', async function (): Promise<void> {
			await mutex.runSequential(foo)
			expect(mutex.isLocked()).toEqual(false)
		})
	}) // #isLocked()
})
