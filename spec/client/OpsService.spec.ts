/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

/* eslint @typescript-eslint/no-explicit-any: "off" */

import {
	HGrid,
	HDict,
	Kind,
	HRef,
	HNum,
	HStr,
	HDate,
	HDateTime,
} from 'haystack-core'
import { Client } from '../../src/client/Client'
import { HisRange, OpsService } from '../../src/client/OpsService'
import fetchMock from 'fetch-mock'

describe('OpsService', function (): void {
	const base = 'http://localhost:8080'
	const ABS_DEFS_PATH = `${base}/api/sys/eval`

	let grid: HGrid
	let client: Client
	let ops: OpsService

	function prepareFetch(): void {
		grid = HGrid.make({ rows: [{ foo: true }] })

		fetchMock.reset().post(ABS_DEFS_PATH, grid.toZinc())

		client = new Client({ base: new URL(base), fetch })

		ops = new OpsService(client)
	}

	beforeEach(prepareFetch)

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

		ops = new OpsService(client)
	}

	function preparePostOp(op: string, zinc: string = grid.toZinc()): void {
		fetchMock.post(getOpUrl(op), {
			body: zinc,
			headers: { 'content-type': 'text/zinc' },
		})

		client = new Client({
			base: new URL(base),
			project: 'demo',
			fetch,
		})

		ops = new OpsService(client)
	}

	describe('#about()', function (): void {
		it('fetches the data', async function (): Promise<void> {
			prepareGetOp('about')
			expect((await ops.about()).toZinc()).toBe(grid.toZinc())
		})
	}) // #about()

	describe('#ops()', function (): void {
		it('fetches the ops data', async function (): Promise<void> {
			prepareGetOp('ops')
			expect((await ops.ops()).toZinc()).toBe(grid.toZinc())
		})
	}) // #ops()

	describe('#formats()', function (): void {
		it('fetches the format data', async function (): Promise<void> {
			prepareGetOp('formats')
			expect((await ops.formats()).toZinc()).toBe(grid.toZinc())
		})
	}) // #formats()

	describe('#read()', function (): void {
		it('fetches the data', async function (): Promise<void> {
			preparePostOp('read')
			expect((await ops.read('read')).toZinc()).toBe(grid.toZinc())
		})

		it('encodes the filter to a grid', async function (): Promise<void> {
			preparePostOp('read')

			await ops.read('site')

			const argsZinc = HGrid.make([
				HDict.make({ filter: 'site' }),
			]).toZinc()

			expect(fetchMock.lastCall(getOpUrl('read'))?.[1]?.body).toBe(
				argsZinc
			)
		})

		it('encodes the filter and limit to a grid', async function (): Promise<void> {
			preparePostOp('read')

			await ops.read('site', 10)

			const argsZinc = HGrid.make([
				HDict.make({ filter: 'site', limit: 10 }),
			]).toZinc()

			expect(fetchMock.lastCall(getOpUrl('read'))?.[1]?.body).toBe(
				argsZinc
			)
		})

		it('encodes the list of ids to a grid', async function (): Promise<void> {
			preparePostOp('read')

			await ops.read(['id1', 'id2', 'id3'])

			const argsZinc = HGrid.make([
				HDict.make({ id: HRef.make('id1') }),
				HDict.make({ id: HRef.make('id2') }),
				HDict.make({ id: HRef.make('id3') }),
			]).toZinc()

			expect(fetchMock.lastCall(getOpUrl('read'))?.[1]?.body).toBe(
				argsZinc
			)
		})
	}) // #read()

	describe('#pointRead()', function (): void {
		it('fetches the data', async function (): Promise<void> {
			preparePostOp('pointWrite')
			expect((await ops.pointRead('123')).toZinc()).toBe(grid.toZinc())
		})

		it('encodes the id to a grid', async function (): Promise<void> {
			preparePostOp('pointWrite')

			await ops.pointRead('123')

			const argsZinc = HGrid.make([
				HDict.make({ id: HRef.make('123') }),
			]).toZinc()

			expect(fetchMock.lastCall(getOpUrl('pointWrite'))?.[1]?.body).toBe(
				argsZinc
			)
		})
	}) // #pointRead()

	describe('#pointWrite()', function (): void {
		it('fetches the data', async function (): Promise<void> {
			preparePostOp('pointWrite')
			expect(
				(
					await ops.pointWrite({ id: '123', level: 1, val: 10 })
				).toZinc()
			).toBe(grid.toZinc())
		})

		it('encodes the id, level', async function (): Promise<void> {
			preparePostOp('pointWrite')

			await ops.pointWrite({ id: '123', level: 1 })

			const argsZinc = HGrid.make([
				HDict.make({
					id: HRef.make('123'),
					level: HNum.make(1),
				}),
			]).toZinc()

			expect(fetchMock.lastCall(getOpUrl('pointWrite'))?.[1]?.body).toBe(
				argsZinc
			)
		})

		it('encodes the id, level and value to a grid', async function (): Promise<void> {
			preparePostOp('pointWrite')

			await ops.pointWrite({ id: '123', level: 1, val: 10 })

			const argsZinc = HGrid.make([
				HDict.make({
					id: HRef.make('123'),
					level: HNum.make(1),
					val: HNum.make(10),
				}),
			]).toZinc()

			expect(fetchMock.lastCall(getOpUrl('pointWrite'))?.[1]?.body).toBe(
				argsZinc
			)
		})

		it('encodes the id, level and who to a grid', async function (): Promise<void> {
			preparePostOp('pointWrite')

			await ops.pointWrite({ id: '123', level: 1, who: 'Fred' })

			const argsZinc = HGrid.make([
				HDict.make({
					id: HRef.make('123'),
					level: HNum.make(1),
					who: HStr.make('Fred'),
				}),
			]).toZinc()

			expect(fetchMock.lastCall(getOpUrl('pointWrite'))?.[1]?.body).toBe(
				argsZinc
			)
		})

		it('encodes the id, level and duration to a grid', async function (): Promise<void> {
			preparePostOp('pointWrite')

			await ops.pointWrite({
				id: '123',
				level: 1,
				duration: HNum.make(10, 'sec'),
			})

			const argsZinc = HGrid.make([
				HDict.make({
					id: HRef.make('123'),
					level: HNum.make(1),
					duration: HNum.make(10, 'sec'),
				}),
			]).toZinc()

			expect(fetchMock.lastCall(getOpUrl('pointWrite'))?.[1]?.body).toBe(
				argsZinc
			)
		})
	}) // #pointWrite()

	describe('#hisRead()', function (): void {
		it('fetches the data', async function (): Promise<void> {
			preparePostOp('hisRead')
			expect((await ops.hisRead('123', HisRange.Today)).toZinc()).toBe(
				grid.toZinc()
			)
		})

		it('encodes the id and `today` to a grid', async function (): Promise<void> {
			preparePostOp('hisRead')

			await ops.hisRead('123', HisRange.Today)

			const argsZinc = HGrid.make([
				HDict.make({ id: HRef.make('123'), range: HStr.make('today') }),
			]).toZinc()

			expect(fetchMock.lastCall(getOpUrl('hisRead'))?.[1]?.body).toBe(
				argsZinc
			)
		})

		it('encodes the id and date to a grid', async function (): Promise<void> {
			preparePostOp('hisRead')

			await ops.hisRead('123', HDate.make('2020-07-10'))

			const argsZinc = HGrid.make([
				HDict.make({
					id: HRef.make('123'),
					range: HStr.make('2020-07-10'),
				}),
			]).toZinc()

			expect(fetchMock.lastCall(getOpUrl('hisRead'))?.[1]?.body).toBe(
				argsZinc
			)
		})

		it('encodes the id and two dates to a grid', async function (): Promise<void> {
			preparePostOp('hisRead')

			await ops.hisRead('123', [
				HDate.make('2020-07-09'),
				HDate.make('2020-07-10'),
			])

			const argsZinc = HGrid.make([
				HDict.make({
					id: HRef.make('123'),
					range: HStr.make('2020-07-09,2020-07-10'),
				}),
			]).toZinc()

			expect(fetchMock.lastCall(getOpUrl('hisRead'))?.[1]?.body).toBe(
				argsZinc
			)
		})

		it('encodes the id and date time to a grid', async function (): Promise<void> {
			preparePostOp('hisRead')

			await ops.hisRead('123', HDateTime.make('2020-07-10T10:35:54.142Z'))

			const argsZinc = HGrid.make([
				HDict.make({
					id: HRef.make('123'),
					range: HStr.make('2020-07-10T10:35:54.142Z'),
				}),
			]).toZinc()

			expect(fetchMock.lastCall(getOpUrl('hisRead'))?.[1]?.body).toBe(
				argsZinc
			)
		})

		it('encodes the id and two date times to a grid', async function (): Promise<void> {
			preparePostOp('hisRead')

			await ops.hisRead('123', [
				HDateTime.make('2020-07-09T10:35:54.142Z'),
				HDateTime.make('2020-07-10T10:35:54.142Z'),
			])

			const argsZinc = HGrid.make([
				HDict.make({
					id: HRef.make('123'),
					range: HStr.make(
						'2020-07-09T10:35:54.142Z,2020-07-10T10:35:54.142Z'
					),
				}),
			]).toZinc()

			expect(fetchMock.lastCall(getOpUrl('hisRead'))?.[1]?.body).toBe(
				argsZinc
			)
		})
	}) // #hisRead()

	describe('#hisWrite()', function (): void {
		let dict: HDict

		beforeEach(function (): void {
			dict = HDict.make({
				ts: HDateTime.make('2020-07-10T10:35:54.142Z'),
				val: HNum.make(10),
			})
		})

		it('fetches the data', async function (): Promise<void> {
			preparePostOp('hisWrite')
			expect((await ops.hisWrite('123', dict)).toZinc()).toBe(
				grid.toZinc()
			)
		})

		it('encodes the id and records to a grid', async function (): Promise<void> {
			preparePostOp('hisWrite')

			await ops.hisWrite('123', dict)

			const argsZinc = HGrid.make({
				meta: HDict.make({ id: HRef.make('123') }),
				rows: [dict],
			}).toZinc()

			expect(fetchMock.lastCall(getOpUrl('hisWrite'))?.[1]?.body).toBe(
				argsZinc
			)
		})
	}) // #hisWrite()

	describe('#invokeAction()', function (): void {
		it('fetches the data', async function (): Promise<void> {
			preparePostOp('invokeAction')
			expect((await ops.invokeAction('123', 'foo')).toZinc()).toBe(
				grid.toZinc()
			)
		})

		it('encodes the id and action and arguments to a grid', async function (): Promise<void> {
			preparePostOp('invokeAction')

			await ops.invokeAction('123', 'foo', { foo: 'bar' })

			const argsZinc = HGrid.make({
				meta: HDict.make({
					id: HRef.make('123'),
					action: HStr.make('foo'),
				}),
				rows: [HDict.make({ foo: 'bar' })],
			}).toZinc()

			expect(
				fetchMock.lastCall(getOpUrl('invokeAction'))?.[1]?.body
			).toBe(argsZinc)
		})
	}) // #invokeAction()

	describe('#nav()', function (): void {
		let navIdZinc: string

		beforeEach(function (): void {
			preparePostOp('nav')

			navIdZinc = HGrid.make([
				HDict.make({ navId: HRef.make('navId') }),
			]).toZinc()
		})

		function verifyZincNavId(): void {
			expect(fetchMock.lastCall(getOpUrl('nav'))?.[1]?.body).toBe(
				navIdZinc
			)
		}

		it('fetches nav information', async function (): Promise<void> {
			expect((await ops.nav('test')).toZinc()).toBe(grid.toZinc())
		})

		it('does not encode a navId when not specified', async function (): Promise<void> {
			await ops.nav()

			const argsZinc = HGrid.make({}).toZinc()
			expect(fetchMock.lastCall(getOpUrl('nav'))?.[1]?.body).toBe(
				argsZinc
			)
		})

		it('encodes a navId from a string', async function (): Promise<void> {
			await ops.nav('navId')
			verifyZincNavId()
		})

		it('encodes a navId from a Ref', async function (): Promise<void> {
			await ops.nav(HRef.make('navId'))
			verifyZincNavId()
		})

		it('encodes a navId from a Hayson dict', async function (): Promise<void> {
			await ops.nav({ navId: { _kind: Kind.Ref, val: 'navId' } })
			verifyZincNavId()
		})

		it('encodes a navId from a dict', async function (): Promise<void> {
			await ops.nav(HDict.make({ navId: HRef.make('navId') }))
			verifyZincNavId()
		})

		it('encodes a navId from a grid', async function (): Promise<void> {
			await ops.nav(
				HGrid.make([HDict.make({ navId: HRef.make('navId') })])
			)
			verifyZincNavId()
		})
	}) // #nav()

	describe('#invokeOp()', function (): void {
		const op = 'customOpName'

		it('fetches the data', async function (): Promise<void> {
			preparePostOp(op)
			expect((await ops.invokeOp(op, HGrid.make({}))).toZinc()).toBe(
				grid.toZinc()
			)
		})

		it('encodes the grid as an argument if specified', async function (): Promise<void> {
			preparePostOp(op)

			const grid = HGrid.make({ rows: [{ test: 'test' }] })

			await ops.invokeOp(op, grid)

			expect(fetchMock.lastCall(getOpUrl(op))?.[1]?.body).toBe(
				grid.toZinc()
			)
		})

		it('does not encode a body if grid not specified', async function (): Promise<void> {
			preparePostOp(op)

			await ops.invokeOp(op)

			expect(fetchMock.lastCall(getOpUrl(op))?.[1]?.body).toBeUndefined()
		})
	}) // #invokeOp()
})
