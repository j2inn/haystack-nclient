/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

/* eslint @typescript-eslint/no-explicit-any: "off" */

import {
	ApiSubject,
	LINGER_TIMEOUT_MS,
} from '../../../src/client/watches/ApiSubject'
import { DEFAULT_POLL_RATE_SECS } from '../../../src/client/watches/Watch'
import { Kind, HGrid, HDict, HRef, HStr, HNamespace } from 'haystack-core'
import {
	WatchEventType,
	WatchChangedEvent,
} from '../../../src/client/watches/WatchEvent'
import { GridError } from '../../../src/client/GridError'
import {
	getOpUrl,
	getHaystackServiceUrl,
	getHostServiceUrl,
} from '../../../src/util/http'
import { WatchApis } from '../../../src/client/watches/WatchApis'
import { ClientServiceConfig } from '../../../src/client/ClientServiceConfig'

jest.useFakeTimers()

describe('ApiSubject', function (): void {
	let subject: ApiSubject
	let apis: WatchApis
	let firstGrid: HGrid
	let secondGrid: HGrid
	let combinedGrid: HGrid
	let firstDict: HDict
	let secondDict: HDict
	let serviceConfig: ClientServiceConfig

	const origin = 'origin'
	const project = 'demo'

	beforeEach(function (): void {
		serviceConfig = {
			getOpUrl: (op: string): string =>
				getOpUrl(origin, '', 'api', project, op),
			getHaystackServiceUrl: (path: string): string =>
				getHaystackServiceUrl(origin, '', project, path),
			getHostServiceUrl: (path: string): string =>
				getHostServiceUrl(origin, '', path),
			getDefaultOptions: (): RequestInit => ({}),
			defs: new HNamespace(HGrid.make({})),
		}

		apis = {
			open: jest.fn(),
			add: jest.fn(),
			poll: jest.fn(),
			refresh: jest.fn(),
			remove: jest.fn(),
			close: jest.fn(),
		}
		subject = new ApiSubject(apis, serviceConfig, DEFAULT_POLL_RATE_SECS)

		firstDict = HDict.make({
			id: HRef.make('foo'),
			data: HStr.make('some data'),
		})

		firstGrid = HGrid.make({
			meta: HDict.make({ watchId: HRef.make('watchId') }),
			rows: [firstDict],
		})

		secondDict = HDict.make({
			id: HRef.make('boo'),
			data: HStr.make('some data again'),
		})

		secondGrid = HGrid.make({
			meta: HDict.make({ watchId: HRef.make('watchId') }),
			rows: [secondDict],
		})

		combinedGrid = HGrid.make({
			meta: HDict.make({ watchId: HRef.make('watchId') }),
			rows: [firstDict, secondDict],
		})
	})

	function asMock(cb: unknown): jest.Mock {
		return cb as jest.Mock
	}

	function mockOpen(): void {
		asMock(apis.open).mockResolvedValue({
			id: firstGrid.meta.get<HStr>('watchId')?.value,
			records: firstGrid.getRows(),
		})
	}

	describe('#grid', function (): void {
		it('returns a grid', function (): void {
			expect(subject.grid.getKind()).toBe(Kind.Grid)
		})
	}) // #grid

	describe('#display', function (): void {
		it('returns a display name for the subject for an open subject', async function (): Promise<void> {
			mockOpen()
			await subject.add(['foo'])
			expect(subject.display).toBe(`watchId @ origin/api/demo/`)
		})
	}) // #display

	describe('#watchId', function (): void {
		it('returns an empty string when not open', function (): void {
			expect(subject.watchId).toBe('')
		})

		it('returns the id for the watch', async function (): Promise<void> {
			mockOpen()
			await subject.add(['foo'])
			expect(subject.watchId).toBe('watchId')
		})
	}) // #watchId

	describe('#add()', function (): void {
		beforeEach(async function (): Promise<void> {
			mockOpen()
			await subject.add(['foo'])
		})

		describe('opens on first call', function (): void {
			it('calls the open op', function (): void {
				expect(apis.open).toHaveBeenCalledWith(['foo'])
			})

			it("updates the subject's grid", function (): void {
				expect(subject.grid).toEqual(firstGrid)
			})

			it('starts the poll timer', function (): void {
				expect(setTimeout).toHaveBeenLastCalledWith(
					expect.any(Function),
					DEFAULT_POLL_RATE_SECS * 1000
				)
			})
		})

		describe('adds after the first call', function (): void {
			beforeEach(async function (): Promise<void> {
				asMock(apis.add).mockResolvedValue(secondGrid)
				await subject.add(['boo'])
			})

			it("adds to the subject's grid", async function (): Promise<void> {
				expect(subject.grid).toEqual(combinedGrid)
			})

			it('does not invoke the add op for already added records', async function (): Promise<void> {
				await subject.add(['boo'])
				expect(apis.add).toBeCalledTimes(1)
			})
		})

		it('cancels linger timer when adding new records after remove', async function (): Promise<void> {
			await subject.remove(['foo'])

			expect(setTimeout).toHaveBeenCalledWith(
				subject.checkClose,
				LINGER_TIMEOUT_MS
			)
		})
	}) // #add()

	describe('#remove()', function (): void {
		beforeEach(async function (): Promise<void> {
			mockOpen()
			await subject.add(['foo'])
		})

		it('removes records from the grid', async function (): Promise<void> {
			await subject.remove(['foo'])
			expect(subject.grid.isEmpty()).toBe(true)
		})

		it('does not invoke ops remove when no data is to be removed', async function (): Promise<void> {
			await subject.remove(['foo'])
			await subject.remove(['foo'])
			expect(apis.remove).toHaveBeenCalledTimes(1)
		})

		it('does not invoke ops remove when reference count is not zero', async function (): Promise<void> {
			await subject.add(['foo'])
			await subject.remove(['foo'])
			expect(apis.remove).not.toHaveBeenCalled()
		})

		it('invokes ops remove method when reference count is zero', async function (): Promise<void> {
			await subject.add(['foo'])
			await subject.remove(['foo'])
			await subject.remove(['foo'])
			expect(apis.remove).toHaveBeenCalledTimes(1)
		})

		it('starts linger timer when all records have been removed', async function (): Promise<void> {
			await subject.remove(['foo'])
			expect(setTimeout).toHaveBeenCalledWith(
				subject.checkClose,
				LINGER_TIMEOUT_MS
			)
		})
	}) // #remove()

	describe('#poll()', function (): void {
		let cb: jest.Mock

		beforeEach(async function (): Promise<void> {
			cb = jest.fn()
			subject.on(cb)
			mockOpen()
			await subject.add(['foo'])
		})

		it('does not poll if the watch id is is not available', async function (): Promise<void> {
			subject = new ApiSubject(
				apis,
				serviceConfig,
				DEFAULT_POLL_RATE_SECS
			)

			await subject.poll()
			expect(apis.poll).not.toHaveBeenCalled()
		})

		it('invokes callback with changed data', async function (): Promise<void> {
			const changed = [
				HDict.make({
					id: HRef.make('foo'),
					data: HStr.make('some changed data'),
				}),
			]

			asMock(apis.poll).mockResolvedValue(changed)
			await subject.poll()

			const event: WatchChangedEvent = {
				type: WatchEventType.Changed,
				ids: {
					foo: {
						changed: [
							{
								name: 'data',
								oldValue: HStr.make('some data'),
								value: HStr.make('some changed data'),
							},
						],
					},
				},
			}

			expect(cb).toHaveBeenCalledWith(event)
		})

		it('invokes callback with added data', async function (): Promise<void> {
			const changed = [
				HDict.make({
					id: HRef.make('foo'),
					data: HStr.make('some data'),
					newData: HStr.make('new data'),
				}),
			]

			asMock(apis.poll).mockResolvedValue(changed)
			await subject.poll()

			const event: WatchChangedEvent = {
				type: WatchEventType.Changed,
				ids: {
					foo: {
						added: [
							{
								name: 'newData',
								value: HStr.make('new data'),
							},
						],
					},
				},
			}

			expect(cb).toHaveBeenCalledWith(event)
		})

		it('invokes callback with removed data', async function (): Promise<void> {
			const changed = [
				HDict.make({
					id: HRef.make('foo'),
				}),
			]

			asMock(apis.poll).mockResolvedValue(changed)
			await subject.poll()

			const event: WatchChangedEvent = {
				type: WatchEventType.Changed,
				ids: {
					foo: {
						removed: [
							{
								name: 'data',
								value: HStr.make('some data'),
							},
						],
					},
				},
			}

			expect(cb).toHaveBeenCalledWith(event)
		})

		it('does not invoke callback when no data has changed', async function (): Promise<void> {
			asMock(apis.poll).mockResolvedValue(firstGrid)
			await subject.poll()

			expect(cb).not.toHaveBeenCalled()
		})

		it('does not invoke callback for records that are not being watched', async function (): Promise<void> {
			const changed = [
				HDict.make({
					id: HRef.make('boo'),
					data: HStr.make('some changed data'),
				}),
			]

			asMock(apis.poll).mockResolvedValue(changed)
			await subject.poll()

			expect(cb).not.toHaveBeenCalled()
		})

		it('does not reject with an error when a callback throws an error', async function (): Promise<void> {
			const errorCb = jest.fn<void, [WatchChangedEvent]>((): void => {
				throw new Error()
			})

			subject.on(errorCb)

			const changed = [
				HDict.make({
					id: HRef.make('foo'),
					data: HStr.make('some changed data'),
				}),
			]

			jest.spyOn(console, 'error').mockImplementation()

			asMock(apis.poll).mockResolvedValue(changed)
			await subject.poll()

			const event: WatchChangedEvent = {
				type: WatchEventType.Changed,
				ids: {
					foo: {
						changed: [
							{
								name: 'data',
								oldValue: HStr.make('some data'),
								value: HStr.make('some changed data'),
							},
						],
					},
				},
			}

			expect(errorCb).toHaveBeenCalledWith(event)
			expect(console.error).toHaveBeenCalled()
		})

		it('restarts the poll timer', async function (): Promise<void> {
			asMock(apis.poll).mockResolvedValue(firstGrid)
			await subject.poll()

			expect(setTimeout).toHaveBeenCalledWith(
				expect.any(Function),
				DEFAULT_POLL_RATE_SECS * 1000
			)
		})

		it("reopens the server side watch if there's a grid error", async function (): Promise<void> {
			const grid = HGrid.make({})
			asMock(apis.poll).mockRejectedValue(new GridError('error', grid))
			await subject.poll()

			expect(apis.close).toHaveBeenCalled()
			expect(apis.open).toHaveBeenCalledWith(['foo'])
		})

		it('throws an error if there is a non-grid error', async function (): Promise<void> {
			asMock(apis.poll).mockRejectedValue(new Error())

			await expect(subject.poll()).rejects.toBeTruthy()
		})
	}) // #poll()

	describe('#refresh()', function (): void {
		beforeEach(function (): void {
			mockOpen()

			asMock(apis.refresh).mockResolvedValue(combinedGrid.getRows())
		})

		it('does not refresh if closed', async function (): Promise<void> {
			await subject.refresh()

			expect(apis.refresh).not.toHaveBeenCalled()
		})

		it('makes an ops refresh call', async function (): Promise<void> {
			await subject.add(['foo'])
			await subject.refresh()
			expect(apis.refresh).toHaveBeenCalled()
		})

		it('restarts the poll timer', async function (): Promise<void> {
			await subject.add(['foo'])
			expect(setTimeout).toHaveBeenCalledWith(
				expect.any(Function),
				DEFAULT_POLL_RATE_SECS * 1000
			)
		})

		it("reopens the server side watch if there's a grid error", async function (): Promise<void> {
			await subject.add(['foo'])
			const grid = HGrid.make({})
			asMock(apis.refresh).mockRejectedValue(new GridError('error', grid))
			await subject.refresh()

			expect(apis.close).toHaveBeenCalled()
			expect(apis.open).toHaveBeenCalled()
		})

		it('throws an error if there is a non-grid error', async function (): Promise<void> {
			await subject.add(['foo'])
			asMock(apis.refresh).mockRejectedValue(new Error())

			await expect(subject.refresh()).rejects.toBeTruthy()
		})
	}) // #refresh()

	describe('#checkClose()', function (): void {
		describe('for an empty grid', function (): void {
			beforeEach(async function (): Promise<void> {
				mockOpen()

				await subject.add(['foo'])
				await subject.remove(['foo'])
				await subject.checkClose()
			})

			it('closes is not open', function (): void {
				expect(subject.isOpen()).toBe(false)
			})

			it('closes the watch', function (): void {
				expect(apis.close).toHaveBeenCalled()
			})
		})

		describe('for a grid that is not empty', function (): void {
			beforeEach(async function (): Promise<void> {
				mockOpen()
				await subject.add(['foo'])
				await subject.checkClose()
			})

			it('is still open', function (): void {
				expect(subject.isOpen()).toBe(true)
			})

			it('does not close the watch', function (): void {
				expect(apis.close).not.toHaveBeenCalled()
			})
		})
	}) // #checkClose()

	describe('#get()', function (): void {
		beforeEach(async function (): Promise<void> {
			mockOpen()
			await subject.add(['foo'])
		})

		it('returns a dict via its string id', function (): void {
			expect(subject.get('foo')?.toJSON()).toEqual(firstDict.toJSON())
		})

		it('returns a dict via its ref id', function (): void {
			expect(subject.get(HRef.make('foo'))?.toJSON()).toEqual(
				firstDict.toJSON()
			)
		})

		it('returns undefined when an id cannot be found', function (): void {
			expect(subject.get('boo')).toBeUndefined()
		})
	}) // #get()

	describe('#pollRate', function (): void {
		beforeEach(async function (): Promise<void> {
			mockOpen()
			await subject.add(['foo'])
			asMock(setTimeout).mockClear()
		})

		it("returns the subject's poll rate", function (): void {
			expect(subject.pollRate).toBe(DEFAULT_POLL_RATE_SECS)
		})

		it('restarts the poll timer for a new poll rate', async function (): Promise<void> {
			subject.pollRate = 6
			expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 6000)
		})

		it("does not restart the poll rate if it's the same", async function (): Promise<void> {
			subject.pollRate = DEFAULT_POLL_RATE_SECS
			expect(setTimeout).not.toHaveBeenCalledWith(
				subject.poll,
				DEFAULT_POLL_RATE_SECS * 1000
			)
		})
	}) // #pollRate
})
