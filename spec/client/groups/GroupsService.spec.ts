/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import {
	HGrid,
	HDict,
	HAYSON_MIME_TYPE,
	HSymbol,
	HStr,
	HRef,
} from 'haystack-core'
import { getHostServiceUrl } from '../../../src/util/http'
import { Client } from '../../../src/client/Client'
import { GroupsService, Group } from '../../../src/client/groups/GroupService'
import fetchMock from 'fetch-mock'

describe('GroupsService', function (): void {
	const base = 'http://localhost:8080'

	let group: GroupsService

	function prepareMock(verb: string, resp: HDict | HGrid): void {
		fetchMock.reset().mock(
			`begin:${getHostServiceUrl({
				origin: base,
				pathPrefix: '',
				path: 'groups',
			})}`,
			{
				body: resp.toJSON(),
				headers: { 'content-type': HAYSON_MIME_TYPE },
			},
			{ method: verb }
		)

		group = new GroupsService(
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

		it('encodes a GET for a group', async function (): Promise<void> {
			await group.readById('foo')

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl({
					origin: base,
					pathPrefix: '',
					path: 'groups',
				})}/foo`
			)
		})

		it('returns a group found', async function (): Promise<void> {
			expect(await group.readById('foo')).toEqual(dict)
		})
	}) // #readById()

	describe('#readByFilter()', function (): void {
		let dicts: HDict[]

		beforeEach(function (): void {
			dicts = [
				HDict.make({ id: HSymbol.make('foo') }),
				HDict.make({ id: HSymbol.make('foo1') }),
			]

			prepareMock('GET', HGrid.make({ rows: dicts }))
		})

		it('encodes a GET for some groups', async function (): Promise<void> {
			await group.readByFilter('site or equip')

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl({
					origin: base,
					pathPrefix: '',
					path: 'groups',
				})}?filter=site%20or%20equip`
			)
		})

		it('encodes a GET for groups with options', async function (): Promise<void> {
			await group.readByFilter('site', {
				sort: ['foo', 'boo'],
				limit: 10,
				columns: ['foo', 'boo'],
			})

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl({
					origin: base,
					pathPrefix: '',
					path: 'groups',
				})}?filter=site&sort=foo%7Cboo&limit=10&columns=foo%7Cboo`
			)
		})

		it('returns some groups', async function (): Promise<void> {
			expect(await group.readByFilter('site')).toEqual(
				HGrid.make({ rows: dicts })
			)
		})
	}) // #readByFilter()

	describe('#readAll()', function (): void {
		let dicts: HDict[]

		beforeEach(function (): void {
			dicts = [
				HDict.make({ id: HSymbol.make('foo') }),
				HDict.make({ id: HSymbol.make('foo1') }),
			]

			prepareMock('GET', HGrid.make({ rows: dicts }))
		})

		it('encodes a GET for some groups', async function (): Promise<void> {
			await group.readAll()

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl({
					origin: base,
					pathPrefix: '',
					path: 'groups',
				})}`
			)
		})

		it('encodes a GET for groups with options', async function (): Promise<void> {
			await group.readAll({
				sort: ['foo', 'boo'],
				limit: 10,
				columns: ['foo', 'boo'],
			})

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl({
					origin: base,
					pathPrefix: '',
					path: 'groups',
				})}?sort=foo%7Cboo&limit=10&columns=foo%7Cboo`
			)
		})

		it('returns some groups', async function (): Promise<void> {
			expect(await group.readAll()).toEqual(
				HGrid.make({ rows: dicts }).getRows()
			)
		})
	})

	describe('#create()', function (): void {
		let grid: HGrid

		beforeEach(function (): void {
			const rows = [HDict.make({ name: HStr.make('group') })]
			grid = HGrid.make({ rows })
			prepareMock('POST', grid)
		})

		it('encodes a POST to create some groups', async function (): Promise<void> {
			await group.create([{ name: 'group' }])

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl({
					origin: base,
					pathPrefix: '',
					path: 'groups',
				})}`
			)
			expect(getLastBody()).toEqual(JSON.stringify(grid.toJSON()))
		})
	}) // #create()

	describe('#createGroup()', function (): void {
		let dict: HDict

		beforeEach(function (): void {
			dict = HDict.make({ name: HStr.make('group') })
			prepareMock('POST', dict)
		})

		it('encodes a POST to create some groups', async function (): Promise<void> {
			await group.createGroup({ name: 'group' })

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl({
					origin: base,
					pathPrefix: '',
					path: 'groups',
				})}`
			)
			expect(getLastBody()).toEqual(JSON.stringify(dict.toJSON()))
		})
	}) // #createUser()

	describe('#update()', function (): void {
		let dict: Group

		beforeEach(function (): void {
			dict = HDict.make({
				id: HRef.make('foo'),
				userGroup: HStr.make('bar'),
			})

			prepareMock('PATCH', dict)
		})

		it('encodes a PATCH for a group', async function (): Promise<void> {
			await group.update(dict)

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl({
					origin: base,
					pathPrefix: '',
					path: 'groups',
				})}/foo`
			)
		})

		it('returns a record found', async function (): Promise<void> {
			expect(await group.update(dict)).toEqual(dict)
		})
	}) // #update()

	describe('#deleteById()', function (): void {
		beforeEach(function (): void {
			prepareMock('DELETE', HDict.make({}))
		})

		it('encodes a DELETE for a group', async function (): Promise<void> {
			await group.deleteById('foo')

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl({
					origin: base,
					pathPrefix: '',
					path: 'groups',
				})}/foo`
			)
		})
	}) // #deleteById()
})
