/*
 * Copyright (c) 2021, J2 Innovations. All Rights Reserved
 */

import { HGrid } from 'haystack-core'
import { BatchSubject } from '../../../src/client/watches/BatchSubject'
import { Subject } from '../../../src/client/watches/Subject'

describe('BatchSubject', function (): void {
	let subject: Subject
	let batch: BatchSubject
	let ops: string[]

	beforeEach(function (): void {
		ops = []

		subject = {
			add: jest.fn().mockImplementation(async (ids: string[]) => {
				ops.push('add:' + ids.join(','))
			}),
			remove: jest.fn().mockImplementation(async (ids: string[]) => {
				ops.push('remove:' + ids.join(','))
			}),
			update: jest.fn(),
		} as unknown as Subject

		batch = new BatchSubject(subject)
	})

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
	}) // #remove()

	describe('#update()', () => {
		it('calls inner subject update', async () => {
			const grid = new HGrid()
			await batch.update(grid)
			expect(subject.update).toHaveBeenCalledWith(grid)
		})
	}) // #update()
})
