/*
 * Copyright (c) 2021, J2 Innovations. All Rights Reserved
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
import { RolesService, Role } from '../../../src/client/roles/RolesService'
import fetchMock from 'fetch-mock'

describe('rolesService', function (): void {
	const base = 'http://localhost:8080'

	let role: RolesService

	function prepareMock(verb: string, resp: HDict | HGrid): void {
		fetchMock.reset().mock(
			`begin:${getHostServiceUrl({
				origin: base,
				pathPrefix: '',
				path: 'roles',
			})}`,
			{
				body: resp.toJSON(),
				headers: { 'content-type': HAYSON_MIME_TYPE },
			},
			{ method: verb }
		)

		role = new RolesService(
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

		it('encodes a GET for a role', async function (): Promise<void> {
			await role.readById('foo')

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl({
					origin: base,
					pathPrefix: '',
					path: 'roles',
				})}/foo`
			)
		})

		it('returns a role found', async function (): Promise<void> {
			expect(await role.readById('foo')).toEqual(dict)
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

		it('encodes a GET for some roles', async function (): Promise<void> {
			await role.readByFilter('site or equip')

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl({
					origin: base,
					pathPrefix: '',
					path: 'roles',
				})}?filter=site%20or%20equip`
			)
		})

		it('encodes a GET for roles with options', async function (): Promise<void> {
			await role.readByFilter('site', {
				sort: ['foo', 'boo'],
				limit: 10,
				columns: ['foo', 'boo'],
			})

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl({
					origin: base,
					pathPrefix: '',
					path: 'roles',
				})}?filter=site&sort=foo%7Cboo&limit=10&columns=foo%7Cboo`
			)
		})

		it('returns some roles', async function (): Promise<void> {
			expect(await role.readByFilter('site')).toEqual(
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

		it('encodes a GET for some roles', async function (): Promise<void> {
			await role.readAll()

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl({
					origin: base,
					pathPrefix: '',
					path: 'roles',
				})}`
			)
		})

		it('encodes a GET for roles with options', async function (): Promise<void> {
			await role.readAll({
				sort: ['foo', 'boo'],
				limit: 10,
				columns: ['foo', 'boo'],
			})

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl({
					origin: base,
					pathPrefix: '',
					path: 'roles',
				})}?sort=foo%7Cboo&limit=10&columns=foo%7Cboo`
			)
		})

		it('returns some roles', async function (): Promise<void> {
			expect(await role.readAll()).toEqual(
				HGrid.make({ rows: dicts }).getRows()
			)
		})
	})

	describe('#create()', function (): void {
		let grid: HGrid

		beforeEach(function (): void {
			const rows = [HDict.make({ name: HStr.make('role') })]
			grid = HGrid.make({ rows })
			prepareMock('POST', grid)
		})

		it('encodes a POST to create some roles', async function (): Promise<void> {
			await role.create([{ name: 'role' }])

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl({
					origin: base,
					pathPrefix: '',
					path: 'roles',
				})}`
			)
			expect(getLastBody()).toEqual(JSON.stringify(grid.toJSON()))
		})
	}) // #create()

	describe('#createrole()', function (): void {
		let dict: HDict

		beforeEach(function (): void {
			dict = HDict.make({ name: HStr.make('role') })
			prepareMock('POST', dict)
		})

		it('encodes a POST to create some roles', async function (): Promise<void> {
			await role.createRole({ name: 'role' })

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl({
					origin: base,
					pathPrefix: '',
					path: 'roles',
				})}`
			)
			expect(getLastBody()).toEqual(JSON.stringify(dict.toJSON()))
		})
	}) // #createUser()

	describe('#update()', function (): void {
		let dict: Role

		beforeEach(function (): void {
			dict = HDict.make({
				id: HRef.make('foo'),
				userRole: HStr.make('bar'),
			})

			prepareMock('PATCH', dict)
		})

		it('encodes a PATCH for a role', async function (): Promise<void> {
			await role.update(dict)

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl({
					origin: base,
					pathPrefix: '',
					path: 'roles',
				})}/foo`
			)
		})

		it('returns a record found', async function (): Promise<void> {
			expect(await role.update(dict)).toEqual(dict)
		})
	}) // #update()

	describe('#deleteById()', function (): void {
		beforeEach(function (): void {
			prepareMock('DELETE', HDict.make({}))
		})

		it('encodes a DELETE for a role', async function (): Promise<void> {
			await role.deleteById('foo')

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl({
					origin: base,
					pathPrefix: '',
					path: 'roles',
				})}/foo`
			)
		})
	}) // #deleteById()
})
