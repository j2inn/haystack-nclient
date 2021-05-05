/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { clear, replaceKeys } from '../../src/util/obj'

describe('obj', function (): void {
	describe('clear()', function (): void {
		it('clears all properties from an object', function (): void {
			const obj = { foo: 'bar', test: 123 }
			clear(obj)
			expect(obj).toEqual({})
		})
	}) // clear()

	describe('replaceKeys()', function (): void {
		it('replaces all of the keys in a string', function (): void {
			expect(
				replaceKeys('/{{foo}}/{{bar}}/', { foo: 'Foo', bar: 'Bar' })
			).toBe('/Foo/Bar/')
		})

		it('skips keys that are not found', function (): void {
			expect(replaceKeys('/{{foo}}/{{bar}}/', { foo: 'Foo' })).toBe(
				'/Foo/{{bar}}/'
			)
		})
	}) // replaceKeys()
})
