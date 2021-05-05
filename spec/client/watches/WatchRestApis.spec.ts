/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import {
	HGrid,
	HRef,
	HDict,
	HStr,
	HNamespace,
	HList,
	HAYSON_MIME_TYPE,
} from 'haystack-core'
import {
	getHaystackServiceUrl,
	getHostServiceUrl,
} from '../../../src/util/http'
import { Client, DEFAULT_OPS_URL_TEMPLATE } from '../../../src/client/Client'
import fetchMock from 'fetch-mock'
import { WatchRestApis } from '../../../src/client/watches/WatchRestApis'
import { DEFAULT_LEASE_TIME } from '../../../src/client/watches/WatchApis'
import { getOpUrl } from '../../../src/util/http'

describe('WatchRestApis', function (): void {
	const base = 'http://localhost:8080'

	let client: Client
	let apis: WatchRestApis

	function prepareClient(): void {
		client = new Client({ base: new URL(base), project: 'demo', fetch })

		apis = new WatchRestApis({
			getOpUrl: (op: string): string =>
				getOpUrl(DEFAULT_OPS_URL_TEMPLATE, {
					origin: client.origin,
					pathPrefix: '',
					project: client.project,
					op,
				}),

			getDefaultOptions: (): RequestInit => ({}),
			defs: new HNamespace(HGrid.make({})),
			getHaystackServiceUrl: (path: string): string =>
				getHaystackServiceUrl(client.origin, '', client.project, path),
			getHostServiceUrl: (path: string): string =>
				getHostServiceUrl(client.origin, '', path),
			fetch,
		})
	}

	beforeEach(function (): void {
		fetchMock.get('/', '')
		client = new Client({ base: new URL(base), project: 'demo' })
	})

	describe('#open()', function (): void {
		let reqBody: string
		let resp: HDict

		beforeEach(function (): void {
			resp = HDict.make({
				id: HStr.make('myWatch'),
				records: HList.make([HDict.make({ id: HRef.make('watch0') })]),
			})

			prepareClient()

			fetchMock
				.reset()
				.post(client.getHaystackServiceUrl('watches?records=true'), {
					body: JSON.stringify(resp.toJSON()),
					headers: { 'content-type': HAYSON_MIME_TYPE },
				})

			reqBody = JSON.stringify(
				HDict.make({
					name: HStr.make('display'),
					ids: HList.make(['watch0']),
					lease: DEFAULT_LEASE_TIME,
				}).toJSON()
			)
		})

		it('encodes an array of ids', async function (): Promise<void> {
			await apis.open(['watch0'], 'display')
			expect(
				fetchMock.lastCall(
					client.getHaystackServiceUrl('watches?records=true')
				)?.[1]?.body
			).toBe(reqBody)
		})

		it('invokes a watch subscription and gets back a list of records', async function (): Promise<void> {
			const { records } = await apis.open(['id'], 'watchDis')
			expect(records).toEqual(resp.get<HList<HDict>>('records')?.values)
		})

		it('invokes a watch subscription and gets back an id', async function (): Promise<void> {
			const { id } = await apis.open(['id'], 'watchDis')
			expect(id).toEqual('myWatch')
		})
	}) // #open()

	describe('#add()', function (): void {
		let reqBody: string
		let resp: HGrid

		beforeEach(function (): void {
			resp = HGrid.make({
				rows: [HDict.make({ id: HRef.make('foo') })],
			})

			prepareClient()

			fetchMock
				.reset()
				.patch(client.getHaystackServiceUrl('watches/myWatch/ids'), {
					body: JSON.stringify(resp.toJSON()),
					headers: { 'content-type': HAYSON_MIME_TYPE },
				})

			reqBody = JSON.stringify(
				HDict.make({
					add: HList.make(['foo']),
				}).toJSON()
			)
		})

		it('encodes an id to watch', async function (): Promise<void> {
			await apis.add('myWatch', ['foo'])
			expect(
				fetchMock.lastCall(
					client.getHaystackServiceUrl('watches/myWatch/ids')
				)?.[1]?.body
			).toBe(reqBody)
		})

		it('invokes a watch subscription and gets back a list of records', async function (): Promise<void> {
			const records = await apis.add('myWatch', ['foo'])
			expect(records).toEqual(resp.getRows())
		})
	}) // #add()

	describe('#poll()', function (): void {
		let resp: HGrid

		beforeEach(function (): void {
			resp = HGrid.make({
				rows: [HDict.make({ id: HRef.make('foo') })],
			})

			prepareClient()

			fetchMock
				.reset()
				.get(
					'begin:' +
						client.getHaystackServiceUrl('watches/myWatch/poll'),
					{
						body: JSON.stringify(resp.toJSON()),
						headers: { 'content-type': HAYSON_MIME_TYPE },
					}
				)
		})

		it('polls a watch', async function (): Promise<void> {
			await apis.poll('myWatch')
		})
	}) // #poll()

	describe('#refresh()', function (): void {
		let resp: HGrid

		beforeEach(function (): void {
			resp = HGrid.make({
				rows: [HDict.make({ id: HRef.make('foo') })],
			})

			prepareClient()

			fetchMock
				.reset()
				.get(
					'begin:' +
						client.getHaystackServiceUrl(
							'watches/myWatch/poll?all=true'
						),
					{
						body: JSON.stringify(resp.toJSON()),
						headers: { 'content-type': HAYSON_MIME_TYPE },
					}
				)
		})

		it('refreshes a watch', async function (): Promise<void> {
			await apis.refresh('myWatch')
		})
	}) // #refresh()

	describe('#remove()', function (): void {
		let reqBody: string
		let resp: HGrid

		beforeEach(function (): void {
			resp = HGrid.make({
				rows: [HDict.make({ id: HRef.make('foo') })],
			})

			prepareClient()

			fetchMock
				.reset()
				.patch(client.getHaystackServiceUrl('watches/myWatch/ids'), {
					body: JSON.stringify(resp.toJSON()),
					headers: { 'content-type': HAYSON_MIME_TYPE },
				})

			reqBody = JSON.stringify(
				HDict.make({
					remove: HList.make(['foo']),
				}).toJSON()
			)
		})

		it('encodes an id to watch', async function (): Promise<void> {
			await apis.remove('myWatch', ['foo'])
			expect(
				fetchMock.lastCall(
					client.getHaystackServiceUrl('watches/myWatch/ids')
				)?.[1]?.body
			).toBe(reqBody)
		})
	}) // #remove()

	describe('#close()', function (): void {
		beforeEach(function (): void {
			prepareClient()

			fetchMock
				.reset()
				.delete(client.getHaystackServiceUrl('watches/myWatch'), {
					body: '200',
				})
		})

		it('closes a watch', async function (): Promise<void> {
			await apis.close('myWatch')
		})
	}) // #close()
})
