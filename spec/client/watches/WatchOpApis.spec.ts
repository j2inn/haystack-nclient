/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HGrid, HRef, HDict, HMarker, HStr, HNamespace } from 'haystack-core'
import {
	getHaystackServiceUrl,
	getHostServiceUrl,
	getServiceUrl,
} from '../../../src/util/http'
import { Client } from '../../../src/client/Client'
import fetchMock from 'fetch-mock'
import {
	WATCH_SUB_OP,
	WATCH_POLL_OP,
	WATCH_UNSUB_OP,
	WatchOpApis,
} from '../../../src/client/watches/WatchOpApis'
import { DEFAULT_LEASE_TIME } from '../../../src/client/watches/WatchApis'
import { getOpUrl } from '../../../src/util/http'

describe('WatchOpApis', function (): void {
	const base = 'http://localhost:8080'

	let grid: HGrid
	let client: Client
	let watchOps: WatchOpApis

	function prepareClient(): void {
		client = new Client({ base: new URL(base), project: 'demo', fetch })

		watchOps = new WatchOpApis({
			getServiceUrl: (path: string) =>
				getServiceUrl({
					origin,
					path,
				}),
			getOpUrl: (op: string): string =>
				getOpUrl({
					origin: client.origin,
					pathPrefix: '',
					project: client.project,
					op,
				}),

			getDefaultOptions: (): RequestInit => ({}),
			defs: new HNamespace(HGrid.make({})),
			getHaystackServiceUrl: (path: string): string =>
				getHaystackServiceUrl({
					origin: client.origin,
					pathPrefix: '',
					project: client.project,
					path,
				}),
			getHostServiceUrl: (path: string): string =>
				getHostServiceUrl({
					origin: client.origin,
					pathPrefix: '',
					path,
				}),
			fetch,
		})
	}

	beforeEach(function (): void {
		grid = HGrid.make({ rows: [{ foo: true }] })
		client = new Client({ base: new URL(base), project: 'demo' })
	})

	describe('#open()', function (): void {
		let zinc: string

		beforeEach(function (): void {
			grid.meta.set('watchId', HStr.make('id'))
			fetchMock.reset().post(client.getOpUrl(WATCH_SUB_OP), {
				body: grid.toZinc(),
				headers: { 'content-type': 'text/zinc' },
			})
			prepareClient()

			zinc = HGrid.make({
				meta: HDict.make({
					watchDis: HStr.make('watchDis'),
					lease: DEFAULT_LEASE_TIME,
				}),
				rows: [HDict.make({ id: HRef.make('id') })],
			}).toZinc()
		})

		function verifyEncoded(zincData?: string): void {
			expect(
				fetchMock.lastCall(client.getOpUrl(WATCH_SUB_OP))?.[1]?.body
			).toBe(zincData ?? zinc)
		}

		it('invokes a watch subscription and gets back a list of records', async function (): Promise<void> {
			const { records } = await watchOps.open(['id'], 'watchDis')

			expect(records).toEqual(grid.getRows())
		})

		it('invokes a watch subscription and gets back an id', async function (): Promise<void> {
			const { id } = await watchOps.open(['id'], 'watchDis')

			expect(id).toEqual('id')
		})

		it('encodes an array of ids', async function (): Promise<void> {
			await watchOps.open(['id'], 'watchDis')
			verifyEncoded()
		})
	}) // #open()

	describe('#add()', function (): void {
		let zinc: string

		beforeEach(function (): void {
			fetchMock.reset().post(client.getOpUrl(WATCH_SUB_OP), {
				body: grid.toZinc(),
				headers: { 'content-type': 'text/zinc' },
			})
			prepareClient()

			zinc = HGrid.make({
				meta: HDict.make({ watchId: HStr.make('watchId') }),
				rows: [HDict.make({ id: HRef.make('id') })],
			}).toZinc()
		})

		function verifyEncoded(): void {
			expect(
				fetchMock.lastCall(client.getOpUrl(WATCH_SUB_OP))?.[1]?.body
			).toBe(zinc)
		}

		it('invokes a watch subscription', async function (): Promise<void> {
			const records = await watchOps.add('watchId', ['id'])
			expect(records).toEqual(grid.getRows())
		})

		it('encodes an array of ids', async function (): Promise<void> {
			await watchOps.add('watchId', ['id'])
			verifyEncoded()
		})
	}) // #add()

	describe('#poll()', function (): void {
		beforeEach(function (): void {
			fetchMock.reset().post(client.getOpUrl(WATCH_POLL_OP), {
				body: grid.toZinc(),
				headers: { 'content-type': 'text/zinc' },
			})
			prepareClient()
		})

		it('invokes a watch poll', async function (): Promise<void> {
			const records = await watchOps.poll('id')
			expect(records).toEqual(grid.getRows())
		})

		it('encodes a watchId into a grid', async function (): Promise<void> {
			await watchOps.poll('id')

			const zinc = HGrid.make({
				meta: HDict.make({ watchId: HStr.make('id') }),
			}).toZinc()

			expect(
				fetchMock.lastCall(client.getOpUrl(WATCH_POLL_OP))?.[1]?.body
			).toBe(zinc)
		})
	}) // #poll()

	describe('#refresh()', function (): void {
		beforeEach(function (): void {
			fetchMock.reset().post(client.getOpUrl(WATCH_POLL_OP), {
				body: grid.toZinc(),
				headers: { 'content-type': 'text/zinc' },
			})
			prepareClient()
		})

		it('invokes a watch refresh', async function (): Promise<void> {
			const records = await watchOps.refresh('id')
			expect(records).toEqual(grid.getRows())
		})

		it('encodes a watchId into a grid', async function (): Promise<void> {
			await watchOps.refresh('id')

			const zinc = HGrid.make({
				meta: HDict.make({
					watchId: HStr.make('id'),
					refresh: HMarker.make(),
				}),
			}).toZinc()

			expect(
				fetchMock.lastCall(client.getOpUrl(WATCH_POLL_OP))?.[1]?.body
			).toBe(zinc)
		})
	}) // #refresh()

	describe('#remove()', function (): void {
		let zinc: string

		beforeEach(function (): void {
			fetchMock.reset().post(client.getOpUrl(WATCH_UNSUB_OP), {
				body: grid.toZinc(),
				headers: { 'content-type': 'text/zinc' },
			})
			prepareClient()

			zinc = HGrid.make({
				meta: HDict.make({ watchId: HStr.make('watchId') }),
				rows: [HDict.make({ id: HRef.make('id') })],
			}).toZinc()
		})

		function verifyEncoded(): void {
			expect(
				fetchMock.lastCall(client.getOpUrl(WATCH_UNSUB_OP))?.[1]?.body
			).toBe(zinc)
		}

		it('encodes an array of ids', async function (): Promise<void> {
			await watchOps.remove('watchId', ['id'])
			verifyEncoded()
		})
	}) // #remove()

	describe('#close()', function (): void {
		beforeEach(function (): void {
			fetchMock.reset().post(client.getOpUrl(WATCH_UNSUB_OP), {
				body: grid.toZinc(),
				headers: { 'content-type': 'text/zinc' },
			})
			prepareClient()
		})

		it('encodes a watchId into a grid', async function (): Promise<void> {
			await watchOps.close('id')

			const zinc = HGrid.make({
				meta: HDict.make({
					watchId: HStr.make('id'),
					close: HMarker.make(),
				}),
			}).toZinc()

			expect(
				fetchMock.lastCall(client.getOpUrl(WATCH_UNSUB_OP))?.[1]?.body
			).toBe(zinc)
		})
	}) // #close()
})
