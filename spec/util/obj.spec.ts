/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { clear } from '../../src/util/obj'

describe('obj', function (): void {
	describe('clear()', function (): void {
		it('clears all properties from an object', function (): void {
			const obj = { foo: 'bar', test: 123 }
			clear(obj)
			expect(obj).toEqual({})
		})
	}) // clear()
})
