/*
 * Copyright (c) 2022, J2 Innovations. All Rights Reserved
 */

import { BatchProcessor } from '../../src/util/BatchProcessor'

describe('BatchProcessor', function (): void {
	describe('#invoke()', function (): void {
		it('batches together multiple successful invocations', async function (): Promise<void> {
			const batcher = jest.fn().mockReturnValue([1, 2, 3])

			const batch = new BatchProcessor<string, number>(batcher)

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

			const batch = new BatchProcessor<string, number>(batcher)

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

			const batch = new BatchProcessor<string, number>(batcher)

			await expect(batch.invoke('testA')).rejects.toEqual(
				new Error(
					'The batcher return and arguments array size must be the same'
				)
			)
		})
	}) // #invoke()
}) // BatchProcessor
