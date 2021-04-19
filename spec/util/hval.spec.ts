/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { getId, idsToArray, dictsToGrid, idsToDicts } from '../../src/util/hval'
import { HRef, HDict, HGrid, HList, HStr } from 'haystack-core'

describe('hval', function (): void {
	describe('#getId()', function (): void {
		it('returns the id from a dict', function (): void {
			const dict = HDict.make({ id: HRef.make('foo') })
			expect(getId(dict)).toBe('foo')
		})

		it('returns an empty string if the id cannot be found', function (): void {
			const dict = HDict.make({})
			expect(getId(dict)).toBe('')
		})
	}) // #getId()

	describe('#idsToArray()', function (): void {
		let expected: string[]

		beforeEach(function (): void {
			expected = ['a']
		})

		it('returns a grid with ids only from a grid', function (): void {
			const grid = HGrid.make([
				HDict.make({
					id: HRef.make('a'),
					foo: HStr.make('a string'),
				}),
			])

			expect(idsToArray(grid)).toEqual(expected)
		})

		it('returns a grid from a list of refs', function (): void {
			const list = HList.make([HRef.make('a')])
			expect(idsToArray(list)).toEqual(expected)
		})

		it('returns a grid from an array of refs', function (): void {
			const array = [HRef.make('a')]
			expect(idsToArray(array)).toEqual(expected)
		})

		it('returns a grid from an array of strings', function (): void {
			const array = ['a']
			expect(idsToArray(array)).toEqual(expected)
		})

		it('returns a grid from an array of strings with @ symbols', function (): void {
			const array = ['@a']
			expect(idsToArray(array)).toEqual(expected)
		})

		it('returns a grid from an array of dicts', function (): void {
			const array = [HDict.make({ id: HRef.make('a') })]
			expect(idsToArray(array)).toEqual(expected)
		})

		it('returns a grid from a list of dicts', function (): void {
			const array = HList.make([HDict.make({ id: HRef.make('a') })])
			expect(idsToArray(array)).toEqual(expected)
		})

		it('returns a grid from a string', function (): void {
			const value = 'a'
			expect(idsToArray(value)).toEqual(expected)
		})

		it('returns a grid from a string with an @ symbol', function (): void {
			const value = '@a'
			expect(idsToArray(value)).toEqual(expected)
		})

		it('returns a grid from a ref', function (): void {
			const value = HRef.make('a')
			expect(idsToArray(value)).toEqual(expected)
		})

		it('returns a grid from a dict', function (): void {
			const value = HDict.make({ id: HRef.make('a') })
			expect(idsToArray(value)).toEqual(expected)
		})

		it('throws an error if the ids are not recognized', function (): void {
			expect((): void => {
				idsToArray((true as unknown) as string)
			}).toThrow()
		})
	}) // #idsToArray()

	describe('.dictToGrid()', function (): void {
		it('returns a grid from dict', function (): void {
			const dict = HDict.make({ foo: 'bar' })
			expect(dictsToGrid(dict).toJSON()).toEqual(dict.toGrid().toJSON())
		})

		it('returns a grid from a hayson dict', function (): void {
			const dict = { foo: 'bar' }
			expect(dictsToGrid(dict).toJSON()).toEqual(
				HDict.make(dict).toGrid().toJSON()
			)
		})

		it('returns a grid from dict array', function (): void {
			const dicts = [HDict.make({ foo: 'bar' })]
			const grid = HGrid.make({ rows: dicts })
			expect(dictsToGrid(dicts).toJSON()).toEqual(grid.toJSON())
		})

		it('returns a grid from dict list', function (): void {
			const dicts = [HDict.make({ foo: 'bar' })]
			const grid = HGrid.make({ rows: dicts })
			expect(dictsToGrid(HList.make(dicts)).toJSON()).toEqual(
				grid.toJSON()
			)
		})

		it('returns a grid from a hayson dict array', function (): void {
			const dicts = [{ foo: 'bar' }]
			const grid = HGrid.make({ rows: dicts })
			expect(dictsToGrid(dicts).toJSON()).toEqual(grid.toJSON())
		})

		it('returns a grid', function (): void {
			const grid = HGrid.make({ rows: [HDict.make({ foo: 'bar' })] })
			expect(dictsToGrid(grid)).toBe(grid)
		})
	}) // .dictToGrid()

	describe('#idsToDicts()', function (): void {
		it('converts an array of ids to an array of dicts with ids', function (): void {
			const dicts = [
				HDict.make({ id: HRef.make('123') }),
				HDict.make({ id: HRef.make('456') }),
			]

			expect(idsToDicts(['@123', '@456'])).toEqual(dicts)
		})
	}) // #idsToDicts()
})
