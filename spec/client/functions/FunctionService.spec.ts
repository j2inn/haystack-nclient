/*
 * Copyright (c) 2023, J2 Innovations. All Rights Reserved
 */

import {
	HGrid,
	HDict,
	HStr,
	HAYSON_MIME_TYPE,
	HSymbol,
	HRef,
	HMarker,
} from 'haystack-core'
import { getHaystackServiceUrl } from '../../../src/util/http'
import { Client } from '../../../src/client/Client'
import {
	FinFunction,
	FunctionService,
} from '../../../src/client/functions/FunctionService'
import fetchMock from 'fetch-mock'

describe('Function Service:', function (): void {
	const base = 'http://localhost:8080'

	let funcService: FunctionService

	function prepareMock(verb: string, resp: HDict | HGrid): void {
		fetchMock.reset().mock(
			`begin:${getHaystackServiceUrl({
				origin: base,
				pathPrefix: '',
				project: 'demo',
				path: 'funcs',
			})}`,
			{
				body: resp.toJSON(),
				headers: { 'content-type': HAYSON_MIME_TYPE },
			},
			{ method: verb }
		)

		funcService = new FunctionService(
			new Client({ base: new URL(base), project: 'demo', fetch })
		)
	}

	function getLastBody(): string {
		return (fetchMock.lastCall()?.[1]?.body as string) ?? ''
	}

	describe('#readById()', function (): void {
		let dict: HDict

		beforeEach(function (): void {
			dict = HDict.make({ id: HSymbol.make('foo') })

			prepareMock('GET', dict)
		})

		it('encodes a GET for a function', async function (): Promise<void> {
			await funcService.readById('foo')

			expect(fetchMock.lastUrl()).toBe(
				`${getHaystackServiceUrl({
					origin: base,
					pathPrefix: '',
					project: 'demo',
					path: 'funcs',
				})}/foo`
			)
		})

		it('returns a function found', async function (): Promise<void> {
			expect(await funcService.readById('foo')).toEqual(dict)
		})
	}) // #readById()

	describe('#readAll() with filter', function (): void {
		let dicts: HDict[]

		beforeEach(function (): void {
			dicts = [
				HDict.make({ id: HSymbol.make('foo') }),
				HDict.make({ id: HSymbol.make('foo1') }),
			]

			prepareMock('GET', HGrid.make({ rows: dicts }))
		})

		it('encodes a GET for some functions', async function (): Promise<void> {
			await funcService.readAll({ filter: 'site or equip' })

			expect(fetchMock.lastUrl()).toBe(
				`${getHaystackServiceUrl({
					origin: base,
					pathPrefix: '',
					project: 'demo',
					path: 'funcs',
				})}?filter=site%20or%20equip`
			)
		})

		it('encodes a GET for functions with options', async function (): Promise<void> {
			await funcService.readAll({
				filter: 'site',
				sort: ['foo', 'boo'],
				limit: 10,
				columns: ['foo', 'boo'],
			})

			expect(fetchMock.lastUrl()).toBe(
				`${getHaystackServiceUrl({
					origin: base,
					pathPrefix: '',
					project: 'demo',
					path: 'funcs',
				})}?filter=site&sort=foo%7Cboo&limit=10&columns=foo%7Cboo`
			)
		})

		it('returns some functions', async function (): Promise<void> {
			expect(await funcService.readAll({ filter: 'site' })).toEqual(
				HGrid.make({ rows: dicts }).getRows()
			)
		})
	})

	describe('#readAll()', function (): void {
		let dicts: HDict[]

		beforeEach(function (): void {
			dicts = [
				HDict.make({ id: HSymbol.make('foo') }),
				HDict.make({ id: HSymbol.make('foo1') }),
			]

			prepareMock('GET', HGrid.make({ rows: dicts }))
		})

		it('encodes a GET for some functions', async function (): Promise<void> {
			await funcService.readAll()

			expect(fetchMock.lastUrl()).toBe(
				`${getHaystackServiceUrl({
					origin: base,
					pathPrefix: '',
					project: 'demo',
					path: 'funcs',
				})}`
			)
		})

		it('encodes a GET for functions with options', async function (): Promise<void> {
			await funcService.readAll({
				sort: ['foo', 'boo'],
				limit: 10,
				columns: ['foo', 'boo'],
			})

			expect(fetchMock.lastUrl()).toBe(
				`${getHaystackServiceUrl({
					origin: base,
					pathPrefix: '',
					project: 'demo',
					path: 'funcs',
				})}?sort=foo%7Cboo&limit=10&columns=foo%7Cboo`
			)
		})

		it('returns some functions', async function (): Promise<void> {
			expect(await funcService.readAll()).toEqual(
				HGrid.make({ rows: dicts }).getRows()
			)
		})
	})

	describe('#create()', function (): void {
		let grid: HGrid

		beforeEach(function (): void {
			const rows = [HDict.make({ name: HStr.make('function') })]
			grid = HGrid.make({ rows })
			prepareMock('POST', grid)
		})

		it('encodes a POST to create some functions', async function (): Promise<void> {
			await funcService.create([{ name: 'function' }])

			expect(fetchMock.lastUrl()).toBe(
				`${getHaystackServiceUrl({
					origin: base,
					pathPrefix: '',
					project: 'demo',
					path: 'funcs',
				})}`
			)
			expect(getLastBody()).toEqual(JSON.stringify(grid.toJSON()))
		})
	}) // #create()

	describe('#update()', function (): void {
		let dict: FinFunction

		beforeEach(function (): void {
			dict = HDict.make({
				id: HRef.make('foo'),
				finFunc: HMarker.make(),
			})

			prepareMock('PATCH', dict)
		})

		it('encodes a PATCH for a function', async function (): Promise<void> {
			await funcService.update(dict)

			expect(fetchMock.lastUrl()).toBe(
				`${getHaystackServiceUrl({
					origin: base,
					pathPrefix: '',
					project: 'demo',
					path: 'funcs',
				})}/foo`
			)
		})

		it('returns the updated function', async function (): Promise<void> {
			expect(await funcService.update(dict)).toEqual(dict)
		})
	}) // #update()

	describe('#deleteById()', function (): void {
		beforeEach(function (): void {
			prepareMock('DELETE', HDict.make({}))
		})

		it('encodes a DELETE for a function', async function (): Promise<void> {
			await funcService.deleteById('foo')

			expect(fetchMock.lastUrl()).toBe(
				`${getHaystackServiceUrl({
					origin: base,
					pathPrefix: '',
					project: 'demo',
					path: 'funcs',
				})}/foo`
			)
		})
	}) // #deleteById()
})
