/*
 * Copyright (c) 2021, J2 Innovations. All Rights Reserved
 */

import { BatchSubject } from '../../../src/client/watches/BatchSubject'
import { Subject } from '../../../src/client/watches/Subject'

describe('BatchSubject', function (): void {
	let subject: Subject
	let batch: BatchSubject
	let ops: string[]

	beforeEach(function (): void {
		ops = []

		subject = ({
			add: jest.fn().mockImplementation(async (ids: string[]) => {
				ops.push('add:' + ids.join(','))
			}),
			remove: jest.fn().mockImplementation(async (ids: string[]) => {
				ops.push('remove:' + ids.join(','))
			}),
		} as unknown) as Subject

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
				batch.remove(['b']),
				batch.remove(['c']),
				batch.remove(['d']),
				batch.remove(['e']),
				batch.add(['f']),
				batch.add(['g']),
			])

			expect(ops.join(',')).toBe('add:a,f,g,remove:b,c,d,e')
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
				batch.add(['b']),
				batch.remove(['c']),
				batch.add(['d']),
				batch.remove(['e']),
				batch.remove(['f']),
				batch.add(['g']),
			])

			expect(ops.join(',')).toBe('remove:a,c,e,f,add:b,d,g')
		})
	}) // #remove()
})
