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
	}) // #runSequential()

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
