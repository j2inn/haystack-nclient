/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HGrid, HDict, HAYSON_MIME_TYPE, HSymbol } from 'haystack-core'
import { getHaystackServiceUrl } from '../../src/util/http'
import { Client } from '../../src/client/Client'
import { RecordService } from '../../src/client/RecordService'
import fetchMock from 'fetch-mock'

describe('RecordService', function (): void {
	const base = 'http://localhost:8080'

	let record: RecordService

	function prepareMock(verb: string, resp: HDict | HGrid): void {
		fetchMock.reset().mock(
			`begin:${getHaystackServiceUrl({
				origin: base,
				pathPrefix: '',
				project: 'demo',
				path: 'records',
			})}`,
			{
				body: resp.toJSON(),
				headers: { 'content-type': HAYSON_MIME_TYPE },
			},
			{ method: verb }
		)

		record = new RecordService(
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

		it('encodes a GET for a record', async function (): Promise<void> {
			await record.readById('foo')

			expect(fetchMock.lastUrl()).toBe(
				`${getHaystackServiceUrl({
					origin: base,
					pathPrefix: '',
					project: 'demo',
					path: 'records',
				})}/foo`
			)
		})

		it('returns a record found', async function (): Promise<void> {
			expect(await record.readById('foo')).toEqual(dict)
		})
	}) // #readById()

	describe('#readByIds()', function (): void {
		let dicts: HDict[]

		beforeEach(function (): void {
			dicts = [
				HDict.make({ id: HSymbol.make('foo') }),
				HDict.make({ id: HSymbol.make('foo1') }),
			]

			prepareMock('GET', HGrid.make({ rows: dicts }))
		})

		it('encodes a GET for some records', async function (): Promise<void> {
			await record.readByIds(['foo', 'foo1'])

			expect(fetchMock.lastUrl()).toBe(
				`${getHaystackServiceUrl({
					origin: base,
					pathPrefix: '',
					project: 'demo',
					path: 'records',
				})}?ids=foo%7Cfoo1`
			)
		})

		it('encodes a GET for a record with options', async function (): Promise<void> {
			await record.readByIds(['foo', 'foo1'], {
				unique: ['foo', 'boo'],
				sort: ['foo', 'boo'],
				limit: 10,
				columns: ['foo', 'boo'],
			})

			expect(fetchMock.lastUrl()).toBe(
				`${getHaystackServiceUrl({
					origin: base,
					pathPrefix: '',
					project: 'demo',
					path: 'records',
				})}?ids=foo%7Cfoo1&unique=foo%7Cboo&sort=foo%7Cboo&limit=10&columns=foo%7Cboo`
			)
		})

		it('returns some records', async function (): Promise<void> {
			expect(await record.readByIds(['foo', 'foo1'])).toEqual(
				HGrid.make({ rows: dicts })
			)
		})
	}) // #readByIds()

	describe('#readByFilter()', function (): void {
		let dicts: HDict[]

		beforeEach(function (): void {
			dicts = [
				HDict.make({ id: HSymbol.make('foo') }),
				HDict.make({ id: HSymbol.make('foo1') }),
			]

			prepareMock('GET', HGrid.make({ rows: dicts }))
		})

		it('encodes a GET for some records', async function (): Promise<void> {
			await record.readByFilter('site or equip')

			expect(fetchMock.lastUrl()).toBe(
				`${getHaystackServiceUrl({
					origin: base,
					pathPrefix: '',
					project: 'demo',
					path: 'records',
				})}?filter=site%20or%20equip`
			)
		})

		it('encodes a GET for a record with options', async function (): Promise<void> {
			await record.readByFilter('site', {
				unique: ['foo', 'boo'],
				sort: ['foo', 'boo'],
				limit: 10,
				columns: ['foo', 'boo'],
			})

			expect(fetchMock.lastUrl()).toBe(
				`${getHaystackServiceUrl({
					origin: base,
					pathPrefix: '',
					project: 'demo',
					path: 'records',
				})}?filter=site&unique=foo%7Cboo&sort=foo%7Cboo&limit=10&columns=foo%7Cboo`
			)
		})

		it('returns some records', async function (): Promise<void> {
			expect(await record.readByFilter('site')).toEqual(
				HGrid.make({ rows: dicts })
			)
		})
	}) // #readByFilter()

	describe('#readCount()', function (): void {
		beforeEach(function (): void {
			prepareMock('GET', HGrid.make({ meta: { count: 1 }, rows: [] }))
		})

		it('encodes a GET for some records', async function (): Promise<void> {
			await record.readCount('site or equip')

			expect(fetchMock.lastUrl()).toBe(
				`${getHaystackServiceUrl({
					origin: base,
					pathPrefix: '',
					project: 'demo',
					path: 'records',
				})}?count=site%20or%20equip`
			)
		})

		it('returns the count', async function (): Promise<void> {
			expect(await record.readCount('site')).toEqual(1)
		})
	}) // #readCount()

	describe('#create()', function (): void {
		let grid: HGrid

		beforeEach(function (): void {
			grid = HGrid.make({ rows: [{ foo: 'bar' }] })
			prepareMock('POST', grid)
		})

		it('encodes a POST to create some records', async function (): Promise<void> {
			await record.create([{ foo: 'bar' }])

			expect(fetchMock.lastUrl()).toBe(
				`${getHaystackServiceUrl({
					origin: base,
					pathPrefix: '',
					project: 'demo',
					path: 'records',
				})}`
			)
			expect(getLastBody()).toEqual(JSON.stringify(grid.toJSON()))
		})
	}) // #create()

	describe('#createRecord()', function (): void {
		let dict: HDict

		beforeEach(function (): void {
			dict = HDict.make({ foo: 'bar' })
			prepareMock('POST', dict)
		})

		it('encodes a POST to create a record', async function (): Promise<void> {
			await record.createRecord({ foo: 'bar' })

			expect(fetchMock.lastUrl()).toBe(
				`${getHaystackServiceUrl({
					origin: base,
					pathPrefix: '',
					project: 'demo',
					path: 'records',
				})}`
			)
			expect(getLastBody()).toEqual(JSON.stringify(dict.toJSON()))
		})
	}) // #createRecord()

	describe('#deleteById()', function (): void {
		let dict: HDict

		beforeEach(function (): void {
			dict = HDict.make({ id: 'foo' })
			prepareMock('DELETE', dict)
		})

		it('encodes a DELETE to delete a record', async function (): Promise<void> {
			await record.deleteById('foo')

			expect(fetchMock.lastUrl()).toBe(
				`${getHaystackServiceUrl({
					origin: base,
					pathPrefix: '',
					project: 'demo',
					path: 'records',
				})}/foo`
			)
		})

		it('returns the deleted record', async function (): Promise<void> {
			expect(await record.deleteById('foo')).toEqual(dict)
		})
	}) // #deleteById()

	describe('#deleteByIds()', function (): void {
		let grid: HGrid

		beforeEach(function (): void {
			grid = HGrid.make({ rows: [{ id: 'foo' }, { id: 'foo1' }] })
			prepareMock('DELETE', grid)
		})

		it('encodes a DELETE to delete some record', async function (): Promise<void> {
			await record.deleteByIds(['foo', 'foo1'])

			expect(fetchMock.lastUrl()).toBe(
				`${getHaystackServiceUrl({
					origin: base,
					pathPrefix: '',
					project: 'demo',
					path: 'records',
				})}?ids=foo%7Cfoo1`
			)
		})

		it('returns the deleted records', async function (): Promise<void> {
			expect(await record.deleteByIds(['foo', 'foo1'])).toEqual(grid)
		})
	}) // #deleteByIds()

	describe('#deleteByFilter()', function (): void {
		let grid: HGrid

		beforeEach(function (): void {
			grid = HGrid.make({ rows: [{ id: 'foo' }, { id: 'foo1' }] })
			prepareMock('DELETE', grid)
		})

		it('encodes a DELETE to delete some record', async function (): Promise<void> {
			await record.deleteByFilter('site and equip')

			expect(fetchMock.lastUrl()).toBe(
				`${getHaystackServiceUrl({
					origin: base,
					pathPrefix: '',
					project: 'demo',
					path: 'records',
				})}?filter=site%20and%20equip`
			)
		})

		it('returns the deleted records', async function (): Promise<void> {
			expect(await record.deleteByFilter('site and equip')).toEqual(grid)
		})
	}) // #deleteByFilter()

	describe('#updateByFilter()', function (): void {
		let dict: HDict

		beforeEach(function (): void {
			dict = HDict.make({ id: 'foo' })
			prepareMock('PATCH', HGrid.make({ rows: [dict] }))
		})

		it('encodes a PATCH to update some record', async function (): Promise<void> {
			await record.updateByFilter('site and equip', dict)

			expect(fetchMock.lastUrl()).toBe(
				`${getHaystackServiceUrl({
					origin: base,
					pathPrefix: '',
					project: 'demo',
					path: 'records',
				})}?filter=site%20and%20equip`
			)

			expect(getLastBody()).toEqual(JSON.stringify(dict.toJSON()))
		})

		it('returns the deleted records', async function (): Promise<void> {
			expect(await record.updateByFilter('site and equip', dict)).toEqual(
				HGrid.make({ rows: [dict] })
			)
		})
	}) // #updateByFilter()

	describe('#update()', function (): void {
		let dict: HDict

		beforeEach(function (): void {
			dict = HDict.make({ id: 'foo' })
			prepareMock('PATCH', HGrid.make({ rows: [dict] }))
		})

		it('encodes a PATCH to update some record', async function (): Promise<void> {
			await record.update([dict])

			expect(fetchMock.lastUrl()).toBe(
				`${getHaystackServiceUrl({
					origin: base,
					pathPrefix: '',
					project: 'demo',
					path: 'records',
				})}`
			)

			expect(getLastBody()).toEqual(
				JSON.stringify(HGrid.make({ rows: [dict] }).toJSON())
			)
		})

		it('returns the deleted records', async function (): Promise<void> {
			expect(await record.update([dict])).toEqual(
				HGrid.make({ rows: [dict] })
			)
		})
	}) // #update()
})
