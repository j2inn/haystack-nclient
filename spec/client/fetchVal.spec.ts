/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { clearFinCsrfTokens } from '../../src/client/finCsrfFetch'
import { fetchVal } from '../../src/client/fetchVal'
import {
	FIN_AUTH_PATH,
	FIN_AUTH_KEY,
	ZINC_MIME_TYPE,
} from '../../src/util/http'
import fetchMock from 'fetch-mock'
import { HGrid, HDict, HAYSON_MIME_TYPE } from 'haystack-core'
import { HS_ACCEPT_HEADER_VALUE } from '../../src/client/fetchVal'

import '../customMatchers'
import '../matchers'

describe('fetchVal', function (): void {
	const READ = '/read'
	const ABS_URL = 'https://www.foobar.com'
	const ABS_READ = `${ABS_URL}/read`
	const ABS_FIN_AUTH_PATH = `${ABS_URL}${FIN_AUTH_PATH}`

	let respGrid: HGrid
	let authResponse: { headers: { [prop: string]: string } }

	function prepareFetch(error?: boolean): void {
		clearFinCsrfTokens()

		const meta = error
			? HDict.make({
					err: {
						errType: 'error',
						errTrace: 'trace',
						errDis: 'Error',
					},
			  })
			: HDict.make({})

		respGrid = HGrid.make({
			meta,
			rows: [
				HDict.make({ id: 1, name: 'Fred', age: 21 }),
				HDict.make({ id: 2, name: 'George', age: 30 }),
			],
		})

		authResponse = {
			headers: {},
		}

		authResponse.headers[FIN_AUTH_KEY] = 'aKey'
	}

	describe('fetchVal()', function (): void {
		describe('headers', function (): void {
			function prepareZincFetch(
				mimeType = 'text/zinc',
				status = 200
			): void {
				const zinc = respGrid.toZinc() + '\n'

				fetchMock
					.reset()
					.post(FIN_AUTH_PATH, (): unknown => authResponse)
					.get(READ, {
						body: zinc,
						headers: { 'content-type': mimeType },
						status,
					})
					.post(ABS_FIN_AUTH_PATH, (): unknown => authResponse)
					.get(ABS_READ, {
						body: zinc,
						headers: { 'content-type': mimeType },
						status,
					})
			}

			beforeEach(function (): void {
				prepareFetch()
				prepareZincFetch()
			})

			it('returns a grid', async function (): Promise<void> {
				const grid = await fetchVal(READ)

				expect(grid.toJSON()).toEqual(respGrid.toJSON())
			})

			it('add default accept header if not specified', async function (): Promise<void> {
				await fetchVal(READ)

				const headers = fetchMock.lastCall(READ)?.[1]?.headers as {
					accept: string
				}

				expect(headers.accept).toBe(HS_ACCEPT_HEADER_VALUE)
			})

			it('does not add accept zinc header if specified', async function (): Promise<void> {
				const textPlain = 'text/plain'
				await fetchVal(READ, { headers: { accept: textPlain } })

				const headers = fetchMock.lastCall(READ)?.[1]?.headers as {
					accept: string
				}

				expect(headers.accept).toBe(textPlain)
			})

			it('add content-type header for zinc if not specified', async function (): Promise<void> {
				await fetchVal(READ, { body: HGrid.make({}).toZinc() })

				const headers = fetchMock.lastCall(READ)?.[1]?.headers as {
					'content-type': string
				}

				expect(headers['content-type']).toBe(ZINC_MIME_TYPE)
			})

			it('add content-type header for hayson if not specified', async function (): Promise<void> {
				await fetchVal(READ, {
					body: JSON.stringify(HGrid.make({}).toJSON()),
				})

				const headers = fetchMock.lastCall(READ)?.[1]?.headers as {
					'content-type': string
				}

				expect(headers['content-type']).toBe(HAYSON_MIME_TYPE)
			})

			it('does not add content-type if no content', async function (): Promise<void> {
				await fetchVal(READ)

				const headers = fetchMock.lastCall(READ)?.[1]?.headers as {
					'content-type': string
				}

				expect(headers['content-type']).toBeUndefined()
			})

			it('fetches read with credentials included', async function (): Promise<void> {
				await fetchVal(READ)
				expect(fetchMock.lastCall(READ)?.[1]?.credentials).toBe(
					'include'
				)
			})

			it('throws an error when the status is not 200 or 201', async function (): Promise<void> {
				prepareZincFetch('text/zinc', 404)
				await expect(fetchVal(READ)).rejects.toBeInstanceOf(Error)
			})
		}) // headers

		describe('Hayson', function (): void {
			function prepareHaysonFetch(): void {
				const jsonStr = JSON.stringify(respGrid.toJSON())

				const response = {
					body: jsonStr,
					status: 200,
					headers: { 'content-type': HAYSON_MIME_TYPE },
				}

				fetchMock
					.reset()
					.post(FIN_AUTH_PATH, (): unknown => authResponse)
					.get(READ, response)
			}

			beforeEach(function (): void {
				prepareFetch()
				prepareHaysonFetch()
			})

			it('returns a grid', async function (): Promise<void> {
				const grid = await fetchVal(READ)

				expect(grid).toValEqual(respGrid)
			})
		}) // Hayson
	}) // fetchVal()
})
