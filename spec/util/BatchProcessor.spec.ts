/*
 * Copyright (c) 2022, J2 Innovations. All Rights Reserved
 */

import { BatcherFunc, BatchProcessor } from '../../src/util/BatchProcessor'

describe('BatchProcessor', function (): void {
	describe('#invoke()', function (): void {
		it('batches together multiple successful invocations', async function (): Promise<void> {
			const batcher = jest.fn().mockReturnValue([1, 2, 3])

			const batch = new BatchProcessor<string, number>({
				batcher: batcher as BatcherFunc<string, number>,
			})

			const [resA, resB, resC] = await Promise.all([
				batch.invoke('testA'),
				batch.invoke('testB'),
				batch.invoke('testC'),
			])

			expect(resA).toBe(1)
			expect(resB).toBe(2)
			expect(resC).toBe(3)

			expect(batcher).toHaveBeenCalledWith(['testA', 'testB', 'testC'])
		})

		it('batches together one successful and one error invocation', async function (): Promise<void> {
			const batcher = jest.fn().mockReturnValue([1, new Error('2')])

			const batch = new BatchProcessor<string, number>({
				batcher: batcher as BatcherFunc<string, number>,
			})

			const [resA, resB] = await Promise.allSettled([
				batch.invoke('testA'),
				batch.invoke('testB'),
			])

			expect(resA.status).toBe('fulfilled')
			if (resA.status === 'fulfilled') {
				expect(resA.value).toBe(1)
			}

			expect(resB.status).toBe('rejected')
			if (resB.status === 'rejected') {
				expect(resB.reason).toEqual(new Error('2'))
			}

			expect(batcher).toHaveBeenCalledWith(['testA', 'testB'])
		})

		it('throws an error when the batch returns an unequal number of return arguments', async function (): Promise<void> {
			const batcher = jest.fn().mockReturnValue([1, 2])

			const batch = new BatchProcessor<string, number>({
				batcher: batcher as BatcherFunc<string, number>,
			})

			await expect(batch.invoke('testA')).rejects.toEqual(
				new Error(
					'The batcher return and arguments array size must be the same'
				)
			)
		})

		describe('limit', function (): void {
			let batcher: BatcherFunc<number, number> & jest.Mock<any, any>

			beforeEach(function (): void {
				batcher = jest
					.fn()
					.mockImplementation(async (args: number[]) => args)
			})

			async function invoke(limit: number): Promise<void> {
				const batch = new BatchProcessor<number, number>({
					batcher,
					limit,
				})

				await Promise.all(
					[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => batch.invoke(i))
				)
			}

			it('divides up 10 requests into 1 calls with a limit of 10', async function (): Promise<void> {
				await invoke(10)

				expect(batcher).toBeCalledTimes(1)

				expect(batcher.mock.calls[0][0]).toEqual([
					0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
				])
			})

			it('divides up 10 requests into 2 calls with a limit of 5', async function (): Promise<void> {
				await invoke(5)

				expect(batcher).toBeCalledTimes(2)

				expect(batcher.mock.calls[0][0]).toEqual([0, 1, 2, 3, 4])
				expect(batcher.mock.calls[1][0]).toEqual([5, 6, 7, 8, 9])
			})

			it('divides up 10 requests into 3 calls with a limit of 4', async function (): Promise<void> {
				await invoke(4)

				expect(batcher).toBeCalledTimes(3)

				expect(batcher.mock.calls[0][0]).toEqual([0, 1, 2, 3])
				expect(batcher.mock.calls[1][0]).toEqual([4, 5, 6, 7])
				expect(batcher.mock.calls[2][0]).toEqual([8, 9])
			})

			it('divides up 10 requests into 4 calls with a limit of 3', async function (): Promise<void> {
				await invoke(3)

				expect(batcher).toBeCalledTimes(4)

				expect(batcher.mock.calls[0][0]).toEqual([0, 1, 2])
				expect(batcher.mock.calls[1][0]).toEqual([3, 4, 5])
				expect(batcher.mock.calls[2][0]).toEqual([6, 7, 8])
				expect(batcher.mock.calls[3][0]).toEqual([9])
			})

			it('divides up 10 requests into 5 calls with a limit of 2', async function (): Promise<void> {
				await invoke(2)

				expect(batcher).toBeCalledTimes(5)

				expect(batcher.mock.calls[0][0]).toEqual([0, 1])
				expect(batcher.mock.calls[1][0]).toEqual([2, 3])
				expect(batcher.mock.calls[2][0]).toEqual([4, 5])
				expect(batcher.mock.calls[3][0]).toEqual([6, 7])
				expect(batcher.mock.calls[4][0]).toEqual([8, 9])
			})

			it('divides up 10 requests into 10 calls with a limit of 1', async function (): Promise<void> {
				await invoke(1)

				expect(batcher).toBeCalledTimes(10)

				expect(batcher.mock.calls[0][0]).toEqual([0])
				expect(batcher.mock.calls[1][0]).toEqual([1])
				expect(batcher.mock.calls[2][0]).toEqual([2])
				expect(batcher.mock.calls[3][0]).toEqual([3])
				expect(batcher.mock.calls[4][0]).toEqual([4])
				expect(batcher.mock.calls[5][0]).toEqual([5])
				expect(batcher.mock.calls[6][0]).toEqual([6])
				expect(batcher.mock.calls[7][0]).toEqual([7])
				expect(batcher.mock.calls[8][0]).toEqual([8])
				expect(batcher.mock.calls[9][0]).toEqual([9])
			})
		}) // limit
	}) // #invoke()
}) // BatchProcessor
