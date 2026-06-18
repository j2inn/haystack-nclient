/*
 * Copyright (c) 2021, J2 Innovations. All Rights Reserved
 */

import { HGrid, HRef } from 'haystack-core'
import { BatchSubject } from '../../../src/client/watches/BatchSubject'
import {
	Subject,
	SubjectChangedEventHandler,
} from '../../../src/client/watches/Subject'

describe('BatchSubject', function (): void {
	let subject: Subject
	let batch: BatchSubject
	let ops: string[]

	beforeEach(function (): void {
		ops = []

		subject = {
			display: 'inner-display',
			pollRate: 30,
			add: jest.fn().mockImplementation(async (ids: string[]) => {
				ops.push('add:' + ids.join(','))
			}),
			remove: jest.fn().mockImplementation(async (ids: string[]) => {
				ops.push('remove:' + ids.join(','))
			}),
			refresh: jest.fn().mockResolvedValue(undefined),
			update: jest.fn().mockResolvedValue(undefined),
			on: jest.fn(),
			off: jest.fn(),
			get: jest.fn(),
			inspect: jest.fn(),
		} as unknown as Subject

		batch = new BatchSubject(subject)
	})

	describe('#display', function (): void {
		it('delegates to the inner subject', function (): void {
			expect(batch.display).toBe('inner-display')
		})
	}) // #display

	describe('#pollRate', function (): void {
		it('delegates the getter to the inner subject', function (): void {
			expect(batch.pollRate).toBe(30)
		})

		it('delegates the setter to the inner subject', function (): void {
			batch.pollRate = 60
			expect(subject.pollRate).toBe(60)
		})
	}) // #pollRate

	describe('#refresh()', function (): void {
		it('delegates to the inner subject', async function (): Promise<void> {
			await batch.refresh()
			expect(subject.refresh).toHaveBeenCalled()
		})
	}) // #refresh()

	describe('#on()', function (): void {
		it('delegates to the inner subject', function (): void {
			const cb: SubjectChangedEventHandler = jest.fn()
			batch.on(cb)
			expect(subject.on).toHaveBeenCalledWith(cb)
		})
	}) // #on()

	describe('#off()', function (): void {
		it('delegates to the inner subject', function (): void {
			const cb: SubjectChangedEventHandler = jest.fn()
			batch.off(cb)
			expect(subject.off).toHaveBeenCalledWith(cb)
		})
	}) // #off()

	describe('#get()', function (): void {
		it('delegates to the inner subject', function (): void {
			const ref = HRef.make('test')
			batch.get(ref)
			expect(subject.get).toHaveBeenCalledWith(ref)
		})
	}) // #get()

	describe('#add()', function (): void {
		it("invokes inner subject's add", async function (): Promise<void> {
			await batch.add(['a'])
			expect(subject.add).toHaveBeenCalledWith(['a'])
		})

		it('invokes all add operations first', async function (): Promise<void> {
			await Promise.all([
				batch.add(['a']),
				batch.add(['b']),
				batch.add(['a']),
				batch.remove(['c']),
				batch.remove(['d']),
				batch.remove(['e']),
				batch.remove(['f']),
				batch.add(['g']),
				batch.add(['h']),
			])

			expect(ops.join(',')).toBe('add:a,b,a,remove:c,d,e,f,add:g,h')
		})

		it('invokes all operations in order', async function (): Promise<void> {
			let order = ''

			await Promise.all([
				batch.add(['a']).then(() => (order += 'a')),
				batch.add(['b']).then(() => (order += 'b')),
				batch.remove(['c']).then(() => (order += 'c')),
				batch.remove(['d']).then(() => (order += 'd')),
				batch.remove(['e']).then(() => (order += 'e')),
				batch.remove(['f']).then(() => (order += 'f')),
				batch.add(['g']).then(() => (order += 'g')),
				batch.add(['h']).then(() => (order += 'h')),
			])

			expect(order).toBe('abcdefgh')
		})

		it('propagates inner subject error to the caller', async function (): Promise<void> {
			const error = new Error('inner add failed')
			;(subject.add as jest.Mock).mockRejectedValue(error)

			await expect(batch.add(['a'])).rejects.toThrow('inner add failed')
		})

		it('propagates inner subject error to all coalesced callers', async function (): Promise<void> {
			const error = new Error('inner add failed')
			;(subject.add as jest.Mock).mockRejectedValue(error)

			// All three queue behind the same batch window and coalesce into one inner call.
			const results = await Promise.allSettled([
				batch.add(['a']),
				batch.add(['b']),
				batch.add(['c']),
			])

			expect(results[0].status).toBe('rejected')
			expect(results[1].status).toBe('rejected')
			expect(results[2].status).toBe('rejected')
			// The inner add should only have been invoked once for the batch.
			expect(subject.add).toHaveBeenCalledTimes(1)
		})
	}) // #add()

	describe('#remove()', function (): void {
		it("invokes inner subject's remove", async function (): Promise<void> {
			await batch.remove(['a'])
			expect(subject.remove).toHaveBeenCalledWith(['a'])
		})

		it('invokes all remove operations first', async function (): Promise<void> {
			await Promise.all([
				batch.remove(['a']),
				batch.remove(['b']),
				batch.add(['c']),
				batch.add(['d']),
				batch.remove(['e']),
				batch.remove(['f']),
				batch.remove(['g']),
				batch.remove(['h']),
				batch.add(['i']),
			])

			expect(ops.join(',')).toBe(
				'remove:a,b,add:c,d,remove:e,f,g,h,add:i'
			)
		})

		it('invokes all operations in order', async function (): Promise<void> {
			let order = ''

			await Promise.all([
				batch.remove(['a']).then(() => (order += 'a')),
				batch.remove(['b']).then(() => (order += 'b')),
				batch.add(['c']).then(() => (order += 'c')),
				batch.add(['d']).then(() => (order += 'd')),
				batch.remove(['e']).then(() => (order += 'e')),
				batch.remove(['f']).then(() => (order += 'f')),
				batch.remove(['g']).then(() => (order += 'g')),
				batch.remove(['h']).then(() => (order += 'h')),
				batch.add(['i']).then(() => (order += 'i')),
			])

			expect(order).toBe('abcdefghi')
		})

		it('propagates inner subject error to the caller', async function (): Promise<void> {
			const error = new Error('inner remove failed')
			;(subject.remove as jest.Mock).mockRejectedValue(error)

			await expect(batch.remove(['a'])).rejects.toThrow(
				'inner remove failed'
			)
		})
	}) // #remove()

	describe('error handling', function (): void {
		it('continues processing subsequent ops after a failed op', async function (): Promise<void> {
			;(subject.add as jest.Mock).mockRejectedValueOnce(
				new Error('add failed')
			)
			;(subject.remove as jest.Mock).mockResolvedValue(undefined)

			// add and remove are different ops so they are not coalesced — they
			// sit in the queue as separate entries and are processed in sequence.
			const results = await Promise.allSettled([
				batch.add(['a']),
				batch.remove(['b']),
			])

			expect(results[0].status).toBe('rejected')
			expect(results[1].status).toBe('fulfilled')
			expect(subject.remove).toHaveBeenCalledWith(['b'])
		})
	}) // error handling

	describe('#update()', () => {
		it('calls inner subject update', async () => {
			const grid = new HGrid()
			await batch.update(grid)
			expect(subject.update).toHaveBeenCalledWith(grid)
		})
	}) // #update()
})
