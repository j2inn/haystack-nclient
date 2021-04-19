/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { BatchIds } from '../../src/util/BatchIds'
import { idsToArray } from '../../src/util/hval'

jest.useFakeTimers()

interface Callback {
	(): void
}

describe('BatchIds', function (): void {
	let batch: BatchIds
	let method: jest.Mock

	function asMock(cb: unknown): jest.Mock {
		return cb as jest.Mock
	}

	beforeEach(function (): void {
		method = jest.fn().mockResolvedValue(Promise.resolve())
		batch = new BatchIds(method)
	})

	it('resets a timer for each invocation', function (): void {
		asMock(setTimeout).mockReset()
		asMock(clearTimeout).mockReset()
		asMock(setTimeout).mockReturnValue(1)

		batch.invoke(idsToArray('a'))
		batch.invoke(idsToArray('b'))
		batch.invoke(idsToArray('c'))

		expect(setTimeout).toHaveBeenCalledTimes(3)
		expect(clearTimeout).toHaveBeenCalledTimes(2)
	})

	async function testInvocations(): Promise<void> {
		// Catch all method calls to the timer.
		let cb: Callback | undefined
		asMock(setTimeout).mockImplementation((method: Callback): void => {
			cb = method
		})

		const promises = [
			batch.invoke(idsToArray('a')),
			batch.invoke(idsToArray('b')),
			batch.invoke(idsToArray('c')),
		]

		if (cb) {
			cb()
		}

		jest.runAllTimers()

		await Promise.all(promises)

		expect(method).toHaveBeenCalledWith(['a', 'b', 'c'])
	}

	it('batches the invocations into one call', testInvocations)

	it('batches multiple invocations back to back', async function (): Promise<void> {
		await testInvocations()
		await testInvocations()
	})

	it('rejects all promises on error', async function (): Promise<void> {
		method.mockRejectedValue(new Error())

		// Catch all method calls to the timer.
		let cb: Callback | undefined
		asMock(setTimeout).mockImplementation((method: Callback): void => {
			cb = method
		})

		const promises = [
			batch.invoke(idsToArray('a')),
			batch.invoke(idsToArray('b')),
			batch.invoke(idsToArray('c')),
		]

		if (cb) {
			cb()
		}

		jest.runAllTimers()

		for (const p of promises) {
			await expect(p).rejects.toBeTruthy()
		}
	})
})
