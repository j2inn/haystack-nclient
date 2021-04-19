/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HGrid, HDict, HAYSON_MIME_TYPE, HStr } from 'haystack-core'
import { getHostServiceUrl } from '../../src/util/http'
import { Client } from '../../src/client/Client'
import { ProjectService } from '../../src/client/ProjectService'
import fetchMock from 'fetch-mock'

describe('ProjectService', function (): void {
	const base = 'http://localhost:8080'

	let project: ProjectService

	function prepareMock(verb: string, resp: HDict | HGrid): void {
		fetchMock.reset().mock(
			`begin:${getHostServiceUrl(base, '', 'projects')}`,
			{
				body: resp.toJSON(),
				headers: { 'content-type': HAYSON_MIME_TYPE },
			},
			{ method: verb }
		)

		project = new ProjectService(
			new Client({ base: new URL(base), project: 'demo', fetch })
		)
	}

	function getLastBody(): string {
		return (fetchMock.lastCall()?.[1]?.body as string) ?? ''
	}

	describe('#readByName()', function (): void {
		let dict: HDict

		beforeEach(function (): void {
			dict = HDict.make({ proj: HStr.make('foo') })

			prepareMock('GET', dict)
		})

		it('encodes a GET for a project', async function (): Promise<void> {
			await project.readByName('foo')

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl(base, '', 'projects')}/foo`
			)
		})

		it('returns a project found', async function (): Promise<void> {
			expect(await project.readByName('foo')).toEqual(dict)
		})
	}) // #readByName()

	describe('#readAll()', function (): void {
		let dicts: HDict[]

		beforeEach(function (): void {
			dicts = [
				HDict.make({ name: HStr.make('foo') }),
				HDict.make({ name: HStr.make('foo1') }),
			]

			prepareMock('GET', HGrid.make({ rows: dicts }))
		})

		it('encodes a GET for some projects', async function (): Promise<void> {
			await project.readAll()

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl(base, '', 'projects')}`
			)
		})

		it('returns some projects', async function (): Promise<void> {
			expect(await project.readAll()).toEqual(HGrid.make({ rows: dicts }))
		})
	}) // #readAll()

	describe('#createProject()', function (): void {
		let dict: HDict

		beforeEach(function (): void {
			dict = HDict.make({ name: HStr.make('Fred') })
			prepareMock('POST', dict)
		})

		it('encodes a POST to create some projects', async function (): Promise<void> {
			await project.createProject({ name: 'Fred' })

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl(base, '', 'projects')}`
			)
			expect(getLastBody()).toEqual(JSON.stringify(dict.toJSON()))
		})
	}) // #createProject()

	describe('#update()', function (): void {
		let dict: HDict

		beforeEach(function (): void {
			dict = HDict.make({ name: HStr.make('foo') })

			prepareMock('PATCH', dict)
		})

		it('encodes a PATCH for a project', async function (): Promise<void> {
			await project.update(dict)

			expect(fetchMock.lastUrl()).toBe(
				`${getHostServiceUrl(base, '', 'projects')}/foo`
			)
		})

		it('returns a record found', async function (): Promise<void> {
			expect(await project.update(dict)).toEqual(dict)
		})
	}) // #update()
})
