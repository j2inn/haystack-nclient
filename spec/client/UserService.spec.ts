/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HGrid, HDict, HAYSON_MIME_TYPE, HSymbol, HStr } from 'haystack-core'
import { getHostServiceUrl } from '../../src/util/http'
import { Client } from '../../src/client/Client'
import { UserService } from '../../src/client/UserService'
import fetchMock from 'fetch-mock'

describe('UserService', function (): void {
	const base = 'http://localhost:8080'

	let user: UserService

	function prepareMock(verb: string, resp: HDict | HGrid): void {
		fetchMock.reset().mock(
			`begin:${getHostServiceUrl(base, '', 'users')}`,
			{
				body: resp.toJSON(),
				headers: { 'content-type': HAYSON_MIME_TYPE },
			},
			{ method: verb }
		)

		user = new UserService(
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

		it('encodes a GET for a user', async function (): Promise<void> {
			await user.readById('foo')

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl(base, '', 'users')}/foo`
			)
		})

		it('returns a user found', async function (): Promise<void> {
			expect(await user.readById('foo')).toEqual(dict)
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

		it('encodes a GET for some users', async function (): Promise<void> {
			await user.readByFilter('site or equip')

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl(
					base,
					'',
					'users'
				)}?filter=site%20or%20equip`
			)
		})

		it('encodes a GET for users with options', async function (): Promise<void> {
			await user.readByFilter('site', {
				sort: ['foo', 'boo'],
				limit: 10,
				columns: ['foo', 'boo'],
			})

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl(
					base,
					'',
					'users'
				)}?filter=site&sort=foo%7Cboo&limit=10&columns=foo%7Cboo`
			)
		})

		it('returns some users', async function (): Promise<void> {
			expect(await user.readByFilter('site')).toEqual(
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

		it('encodes a GET for some users', async function (): Promise<void> {
			await user.readAll()

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl(base, '', 'users')}`
			)
		})

		it('encodes a GET for users with options', async function (): Promise<void> {
			await user.readAll({
				sort: ['foo', 'boo'],
				limit: 10,
				columns: ['foo', 'boo'],
			})

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl(
					base,
					'',
					'users'
				)}?sort=foo%7Cboo&limit=10&columns=foo%7Cboo`
			)
		})

		it('returns some users', async function (): Promise<void> {
			expect(await user.readAll()).toEqual(HGrid.make({ rows: dicts }))
		})
	}) // #readAll()

	describe('#create()', function (): void {
		let grid: HGrid

		beforeEach(function (): void {
			const rows = [HDict.make({ name: HStr.make('Fred') })]
			grid = HGrid.make({ rows })
			prepareMock('POST', grid)
		})

		it('encodes a POST to create some users', async function (): Promise<void> {
			await user.create([{ name: 'Fred' }])

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl(base, '', 'users')}`
			)
			expect(getLastBody()).toEqual(JSON.stringify(grid.toJSON()))
		})
	}) // #create()

	describe('#createUser()', function (): void {
		let dict: HDict

		beforeEach(function (): void {
			dict = HDict.make({ name: HStr.make('Fred') })
			prepareMock('POST', dict)
		})

		it('encodes a POST to create some users', async function (): Promise<void> {
			await user.createUser({ name: 'Fred' })

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl(base, '', 'users')}`
			)
			expect(getLastBody()).toEqual(JSON.stringify(dict.toJSON()))
		})
	}) // #createUser()

	describe('#update()', function (): void {
		let dict: HDict

		beforeEach(function (): void {
			dict = HDict.make({ id: HSymbol.make('foo') })

			prepareMock('PATCH', dict)
		})

		it('encodes a PATCH for a user', async function (): Promise<void> {
			await user.update(dict)

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl(base, '', 'users')}/foo`
			)
		})

		it('returns a record found', async function (): Promise<void> {
			expect(await user.update(dict)).toEqual(dict)
		})
	}) // #update()

	describe('#deleteById()', function (): void {
		beforeEach(function (): void {
			prepareMock('DELETE', HDict.make({}))
		})

		it('encodes a DELETE for a user', async function (): Promise<void> {
			await user.deleteById('foo')

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl(base, '', 'users')}/foo`
			)
		})
	}) // #deleteById()
})
