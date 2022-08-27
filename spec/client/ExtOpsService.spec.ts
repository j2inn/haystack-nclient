/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

/* eslint @typescript-eslint/no-explicit-any: "off" */

import { HGrid, HDict, HStr } from 'haystack-core'
import { Client } from '../../src/client/Client'
import fetchMock from 'fetch-mock'
import { ExtOpsService, CommitType } from '../../src/client/ExtOpsService'

describe('ExtOpsService', function (): void {
	const base = 'http://localhost:8080'
	const ABS_DEFS_PATH = `${base}/api/sys/eval`

	let grid: HGrid
	let client: Client
	let ext: ExtOpsService

	function prepareFetch(): void {
		grid = HGrid.make({ rows: [{ foo: true }] })

		fetchMock.reset().post(ABS_DEFS_PATH, {
			body: grid.toZinc(),
			headers: { 'content-type': 'text/zinc' },
		})

		client = new Client({ base: new URL(base), fetch })

		ext = new ExtOpsService(client)
	}

	beforeEach(prepareFetch)

	describe('loadDefs', function (): void {
		describe('#loadDefs()', function (): void {
			it('fetches the defs from the server', async function (): Promise<void> {
				await ext.loadDefs()
				expect(fetchMock.called(ABS_DEFS_PATH)).toBe(true)
				expect(client.defs.grid.get(0)?.has('foo')).toBe(true)
			})

			it('fetches the defs from the server only once', async function (): Promise<void> {
				await Promise.all([
					ext.loadDefs(),
					ext.loadDefs(),
					ext.loadDefs(),
					ext.loadDefs(),
					ext.loadDefs(),
				])

				expect(fetchMock.calls(ABS_DEFS_PATH).length).toBe(1)
			})

			it('fetches the defs from the server again after a failure', async function (): Promise<void> {
				fetchMock.reset()
				await expect(ext.loadDefs()).rejects.toBeTruthy()

				prepareFetch()
				await ext.loadDefs()
				expect(ext.isDefsLoaded()).toBe(true)
			})
		}) // #loadDefs()

		describe('#isDefsLoaded()', function (): void {
			it('returns false when not initialized', function (): void {
				expect(ext.isDefsLoaded()).toBe(false)
			})

			it('returns true when initialized', async function (): Promise<void> {
				await ext.loadDefs()
				expect(ext.isDefsLoaded()).toBe(true)
			})
		}) // #isDefsLoaded()
	}) // loadDefs

	function getOpUrl(op: string): string {
		return `${base}/api/demo/${op}`
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

		ext = new ExtOpsService(client)
	}

	describe('#commit()', function (): void {
		it('fetches the data', async function (): Promise<void> {
			preparePostOp('commit')
			expect(
				(await ext.commit(CommitType.Add, { foo: 'bar' })).toZinc()
			).toBe(grid.toZinc())
		})

		it('encodes the commit type and records to a grid', async function (): Promise<void> {
			preparePostOp('commit')

			await ext.commit(CommitType.Add, { foo: 'bar' })

			const argsZinc = HGrid.make({
				meta: HDict.make({
					commit: HStr.make('add'),
				}),
				rows: [HDict.make({ foo: 'bar' })],
			}).toZinc()

			expect(fetchMock.lastCall(getOpUrl('commit'))?.[1]?.body).toBe(
				argsZinc
			)
		})
	}) // #commit()

	describe('#eval()', function (): void {
		it('fetches the data', async function (): Promise<void> {
			preparePostOp('eval')
			expect((await ext.eval('site')).toZinc()).toBe(grid.toZinc())
		})

		it('encodes the expression to a grid', async function (): Promise<void> {
			preparePostOp('eval')

			await ext.eval('site')

			const argsZinc = HGrid.make([HDict.make({ expr: 'site' })]).toZinc()

			expect(fetchMock.lastCall(getOpUrl('eval'))?.[1]?.body).toBe(
				argsZinc
			)
		})
	}) // #eval()

	describe('#evalAll()', function (): void {
		beforeEach(function (): void {
			const zinc = `${grid.toZinc()}\n${grid.toZinc()}`
			preparePostOp('evalAll', zinc)
		})

		it('is called when one more or more eval expressions are made', async function (): Promise<void> {
			jest.spyOn(ext, 'evalAll')

			const grids = await Promise.all([
				ext.eval('site'),
				ext.eval('defs()'),
			])

			expect(ext.evalAll).toHaveBeenCalled()

			expect(grids.length).toBe(2)
			expect(grids[0].toZinc()).toBe(grid.toZinc())
			expect(grids[1].toZinc()).toBe(grid.toZinc())
		})

		it('fetches the data', async function (): Promise<void> {
			const grids = await ext.evalAll(['site', 'defs()'])

			expect(grids.length).toBe(2)
			expect(grids[0].toZinc()).toBe(grid.toZinc())
			expect(grids[1].toZinc()).toBe(grid.toZinc())
		})

		it('encodes the expression to a grid', async function (): Promise<void> {
			await ext.evalAll(['site', 'defs()'])

			const argsZinc = HGrid.make([
				HDict.make({ expr: 'site' }),
				HDict.make({ expr: 'defs()' }),
			]).toZinc()

			expect(fetchMock.lastCall(getOpUrl('evalAll'))?.[1]?.body).toBe(
				argsZinc
			)
		})
	}) // #evalAll()
})
