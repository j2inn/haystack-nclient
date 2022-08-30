/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { clearFinCsrfTokens } from '../../src/client/finCsrfFetch'
import { fetchAllGrids } from '../../src/client/fetchAllGrids'
import {
	FIN_AUTH_PATH,
	FIN_AUTH_KEY,
	ZINC_MIME_TYPE,
} from '../../src/util/http'
import fetchMock from 'fetch-mock'
import { HGrid, HDict, HAYSON_MIME_TYPE, HMarker } from 'haystack-core'
import { HS_ACCEPT_HEADER_VALUE } from '../../src/client/fetchVal'

describe('fetchGrid', function (): void {
	const READ = '/read'
	const ABS_URL = 'https://www.foobar.com'
	const ABS_READ = `${ABS_URL}/read`
	const ABS_FIN_AUTH_PATH = `${ABS_URL}${FIN_AUTH_PATH}`

	let respGrid: HGrid

	function prepareFetch(error = false, totalGrids = 1): void {
		clearFinCsrfTokens()

		const meta = error
			? HDict.make({
					err: HMarker.make(),
					errType: 'error',
					errTrace: 'trace',
					dis: 'Error',
			  })
			: HDict.make({})

		respGrid = HGrid.make({
			meta,
			rows: [
				HDict.make({ id: 1, name: 'Fred', age: 21 }),
				HDict.make({ id: 2, name: 'George', age: 30 }),
			],
		})

		const authResponse: { headers: { [prop: string]: string } } = {
			headers: {},
		}

		authResponse.headers[FIN_AUTH_KEY] = 'aKey'

		let zinc = ''
		for (let i = 0; i < totalGrids; ++i) {
			zinc += respGrid.toZinc() + '\n'
		}
		fetchMock
			.reset()
			.post(FIN_AUTH_PATH, (): unknown => authResponse)
			.get(READ, zinc)
			.post(ABS_FIN_AUTH_PATH, (): unknown => authResponse)
			.get(ABS_READ, zinc)
	}

	describe('fetchAllGrids()', function (): void {
		beforeEach(function (): void {
			prepareFetch(/*error*/ false, 2)
		})

		it('returns two grids', async function (): Promise<void> {
			const grids = await fetchAllGrids(READ, 2)

			expect(grids.length).toBe(2)
			expect(grids[0].toJSON()).toEqual(respGrid.toJSON())
			expect(grids[1].toJSON()).toEqual(respGrid.toJSON())
		})

		it('add default accept header if not already specified', async function (): Promise<void> {
			await fetchAllGrids(READ, 1)

			const headers = fetchMock.lastCall(READ)?.[1]?.headers as {
				accept: string
			}

			expect(headers.accept).toBe(HS_ACCEPT_HEADER_VALUE)
		})

		it('does not add accept zinc header if already specified', async function (): Promise<void> {
			const textPlain = 'text/plain'
			await fetchAllGrids(READ, 1, { headers: { accept: textPlain } })

			const headers = fetchMock.lastCall(READ)?.[1]?.headers as {
				accept: string
			}

			expect(headers.accept).toBe(textPlain)
		})

		it('add content-type header for zinc if not specified', async function (): Promise<void> {
			await fetchAllGrids(READ, 1, { body: HGrid.make({}).toZinc() })

			const headers = fetchMock.lastCall(READ)?.[1]?.headers as {
				'content-type': string
			}

			expect(headers['content-type']).toBe(ZINC_MIME_TYPE)
		})

		it('add content-type header for hayson if not specified', async function (): Promise<void> {
			await fetchAllGrids(READ, 1, {
				body: JSON.stringify(HGrid.make({}).toJSON()),
			})

			const headers = fetchMock.lastCall(READ)?.[1]?.headers as {
				'content-type': string
			}

			expect(headers['content-type']).toBe(HAYSON_MIME_TYPE)
		})

		it('does not add content-type header if no content', async function (): Promise<void> {
			await fetchAllGrids(READ, 1)

			const headers = fetchMock.lastCall(READ)?.[1]?.headers as {
				'content-type': string
			}

			expect(headers['content-type']).toBeUndefined()
		})

		it('throws an error if zero grids are requested', async function (): Promise<void> {
			await expect(fetchAllGrids(READ, 0)).rejects.toBeTruthy()
		})

		it('returns an error grid in the response if detected', async function (): Promise<void> {
			prepareFetch(/*error*/ true, 2)
			const grids = await fetchAllGrids(READ, 1)

			expect(grids[0].isError()).toBe(true)
		})
	}) // fetchAllGrids()
})
