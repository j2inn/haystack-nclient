/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

/* eslint @typescript-eslint/no-explicit-any: "off" */

import { HGrid, HNamespace } from 'haystack-core'
import { Client } from '../../src/client/Client'
import fetchMock from 'fetch-mock'
import { HS_ACCEPT_HEADER_VALUE } from '../../src/client/fetchVal'
import { getHaystackServiceUrl } from '../../src/util/http'

describe('Client', function (): void {
	const base = 'http://localhost:8080'
	const ABS_DEFS_PATH = getHaystackServiceUrl(base, '', '', 'defs')

	let grid: HGrid
	let client: Client

	function prepareFetch(): void {
		grid = HGrid.make({ rows: [{ foo: true }] })

		fetchMock.reset().get(ABS_DEFS_PATH, {
			body: grid.toZinc(),
			headers: { 'content-type': 'text/zinc' },
		})

		client = new Client({ base: new URL(base), fetch })
	}

	beforeEach(prepareFetch)

	describe('#constructor()', function (): void {
		describe('constructs a client', function (): void {
			describe('from a URL', function (): void {
				it('with an origin', function (): void {
					expect(client.origin).toBe(base)
				})

				it('with an empty project', function (): void {
					expect(client.project).toBe('')
				})
			}) // from a URL

			describe('from a URL with a path', function (): void {
				beforeEach(function (): void {
					client = new Client({
						base: new URL(`${base}/this/that?query=foo`),
					})
				})

				it('with an origin', function (): void {
					expect(client.origin).toBe(base)
				})

				it('with an empty project', function (): void {
					expect(client.project).toBe('')
				})
			}) // from a aURL with a path

			describe('from a finMobile URL', function (): void {
				beforeEach(function (): void {
					client = new Client({
						base: new URL(`${base}/finMobile/demo?foo`),
					})
				})

				it('with an origin', function (): void {
					expect(client.origin).toBe(base)
				})

				it('with a `demo` project', function (): void {
					expect(client.project).toBe('demo')
				})
			}) // from a finMobile URL

			describe('from a project API URL', function (): void {
				beforeEach(function (): void {
					client = new Client({
						base: new URL(`${base}/api/demo/ops`),
					})
				})

				it('with an origin', function (): void {
					expect(client.origin).toBe(base)
				})

				it('with a `demo` project', function (): void {
					expect(client.project).toBe('demo')
				})
			}) // from a project API URL

			describe('from a projects URL', function (): void {
				beforeEach(function (): void {
					client = new Client({
						base: new URL(
							`${base}/something/projects/demo?something=else`
						),
					})
				})

				it('with an origin', function (): void {
					expect(client.origin).toBe(base)
				})

				it('with a `demo` project', function (): void {
					expect(client.project).toBe('demo')
				})
			}) // from a projects URL

			describe('from a URL with a project name', function (): void {
				const url = new URL(base)

				beforeEach(function (): void {
					client = new Client({ base: url, project: 'demo' })
				})

				it('with an origin', function (): void {
					expect(client.origin).toBe(base)
				})

				it('with a `demo` project', function (): void {
					expect(client.project).toBe('demo')
				})
			}) // from a URL with a project name

			describe('with some defs', function (): void {
				it('creates a client that is already initalized', function (): void {
					const grid = HGrid.make({ rows: [{ test: 'test' }] })

					const defs = new HNamespace(grid)
					client = new Client({ base: new URL(base), defs })
					expect(client.defs.grid.isEmpty()).toBe(false)
				})
			}) // with some defs

			describe('with some options', function (): void {
				it('creates a client with some options', function (): void {
					client = new Client({
						base: new URL(base),
						options: { mode: 'cors' },
					})

					expect(client.getDefaultOptions()).toEqual({
						mode: 'cors',
					})
				})
			}) // with some options

			describe('with an `authBearer` token', function (): void {
				it('creates a client with an Authorization header when no options are specified', function (): void {
					client = new Client({
						base: new URL(base),
						authBearer: '123',
					})

					expect(client.getDefaultOptions()).toEqual({
						headers: {
							Authorization: 'Bearer 123',
						},
					})
				})

				it('creates a client with an Authorization header with existing options', function (): void {
					client = new Client({
						base: new URL(base),
						options: { mode: 'cors' },
						authBearer: '123',
					})

					expect(client.getDefaultOptions()).toEqual({
						mode: 'cors',
						headers: {
							Authorization: 'Bearer 123',
						},
					})
				})
			}) // with an `authBearer` token

			describe('with the path prefix', function (): void {
				it('creates a client object with a base url and specified path prefix', function (): void {
					client = new Client({
						base: new URL(base),
						pathPrefix: '/happy/path/of/42/',
						project: 'demo',
					})

					expect(client.pathPrefix).toEqual(`happy/path/of/42`)
					expect(client.getOpUrl('op')).toContain('happy/path/of/42')
					expect(client.getHaystackServiceUrl('service')).toContain(
						'happy/path/of/42'
					)
					expect(client.getHostServiceUrl('service')).toContain(
						'happy/path/of/42'
					)
				})

				it('should omit the prefix if empty string', function (): void {
					client = new Client({
						base: new URL(base),
						pathPrefix: '',
						project: 'demo',
					})

					expect(client.pathPrefix).toEqual('')
				})

				it('should omit prefix if the string has no content', function (): void {
					client = new Client({
						base: new URL(base),
						pathPrefix: '/',
						project: 'demo',
					})

					expect(client.pathPrefix).toEqual('')
				})
			})
		}) // constructs a client
	}) // #constructor()

	function getOpUrl(op: string): string {
		return `${base}/api/demo/${op}`
	}

	function prepareGetOp(op: string): void {
		fetchMock.get(getOpUrl(op), {
			body: grid.toZinc(),
			headers: { 'content-type': 'text/zinc' },
		})

		client = new Client({
			base: new URL(base),
			project: 'demo',
			fetch,
		})
	}

	describe('#getOpUrl()', function (): void {
		it('returns a URL for an op', function (): void {
			client = new Client({
				base: new URL(base),
				project: 'demo',
				fetch,
			})

			expect(client.getOpUrl('foo')).toBe(
				'http://localhost:8080/api/demo/foo'
			)
		})
	}) // #getOpUrl()

	describe('#getDefaultOptions()', function (): void {
		beforeEach(function (): void {
			prepareGetOp('about')
		})

		it('adds default options to a fetch', async function (): Promise<void> {
			client = new Client({
				base: new URL(base),
				project: 'demo',
				options: { mode: 'cors' },
				fetch,
			})

			expect((await client.ops.about()).toZinc()).toBe(grid.toZinc())

			expect(fetchMock.lastCall(getOpUrl('about'))?.[1]).toEqual({
				credentials: 'include',
				headers: {
					accept: HS_ACCEPT_HEADER_VALUE,
				},
				mode: 'cors',
			})
		})
	}) // #getDefaultOptions()

	describe('loadDefs', function (): void {
		describe('#loadDefs()', function (): void {
			it('fetches the defs from the server', async function (): Promise<void> {
				await client.loadDefs()
				expect(fetchMock.called(ABS_DEFS_PATH)).toBe(true)
				expect(client.defs.grid.get(0)?.has('foo')).toBe(true)
			})

			it('fetches the defs from the server only once', async function (): Promise<void> {
				await Promise.all([
					client.loadDefs(),
					client.loadDefs(),
					client.loadDefs(),
					client.loadDefs(),
					client.loadDefs(),
				])

				expect(fetchMock.calls(ABS_DEFS_PATH).length).toBe(1)
			})

			it('fetches the defs from the server again after a failure', async function (): Promise<void> {
				fetchMock.reset()
				await expect(client.loadDefs()).rejects.toBeTruthy()

				prepareFetch()
				await client.loadDefs()
				expect(client.isDefsLoaded()).toBe(true)
			})
		}) // #loadDefs()

		describe('#isDefsLoaded()', function (): void {
			it('returns false when not initialized', function (): void {
				expect(client.isDefsLoaded()).toBe(false)
			})

			it('returns true when initialized', async function (): Promise<void> {
				await client.loadDefs()
				expect(client.isDefsLoaded()).toBe(true)
			})
		}) // #isDefsLoaded()
	}) // loadDefs

	describe('#toJSON()', function (): void {
		it('encodes the client to a JSON object', function (): void {
			expect(client.toJSON()).toEqual({
				origin: 'http://localhost:8080',
				opsBase: 'api',
				project: '',
				pathPrefix: '',
			})
		})
	}) // #toJSON()
})
