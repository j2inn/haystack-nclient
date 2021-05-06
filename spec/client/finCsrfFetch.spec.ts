/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

/* eslint @typescript-eslint/no-explicit-any: "off" */

import {
	finCsrfFetch,
	clearFinCsrfTokens,
	getFinCsrfToken,
} from '../../src/client/finCsrfFetch'
import {
	FIN_AUTH_PATH,
	SKYARC_ATTEST_KEY,
	FIN_AUTH_KEY,
} from '../../src/util/http'
import fetchMock from 'fetch-mock'
import { HGrid, HDict } from 'haystack-core'

describe('finCsrfFetch', function (): void {
	const READ = '/read'
	const ABS_URL = 'https://www.foobar.com'
	const ABS_READ = `${ABS_URL}/read`
	const ABS_FIN_AUTH_PATH = `${ABS_URL}${FIN_AUTH_PATH}`

	let respGrid: HGrid
	let zinc: string

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

		const authResponse: { headers: { [prop: string]: string } } = {
			headers: {},
		}

		authResponse.headers[FIN_AUTH_KEY] = 'aKey'

		zinc = respGrid.toZinc()
		fetchMock
			.reset()
			.post(FIN_AUTH_PATH, (): unknown => authResponse)
			.get(READ, zinc)
			.post(ABS_FIN_AUTH_PATH, (): unknown => authResponse)
			.get(ABS_READ, zinc)
	}

	beforeEach(function (): void {
		prepareFetch()
	})

	describe('finCsrfFetch()', function (): void {
		it('responds with status 200', async function (): Promise<void> {
			const resp = await finCsrfFetch(READ)
			expect(resp.status === 200)
		})

		it('responds with a response body', async function (): Promise<void> {
			const resp = await finCsrfFetch(READ)
			const body = await resp.text()
			expect(body).toBe(respGrid.toZinc())
		})

		it('fetches read', async function (): Promise<void> {
			await finCsrfFetch(READ)
			expect(fetchMock.called(READ)).toBe(true)
		})

		it('fetches a CSRF token', async function (): Promise<void> {
			await finCsrfFetch(READ)
			expect(fetchMock.called(FIN_AUTH_PATH)).toBe(true)
		})

		it('makes one call for the CSRF token', async function (): Promise<void> {
			await finCsrfFetch(READ)
			expect(fetchMock.calls(FIN_AUTH_PATH).length).toBe(1)
		})

		it('throws an error if the CSRF token cannot be retreived', async function (): Promise<void> {
			// Kill fetching the CSRF token.
			fetchMock.reset().post(FIN_AUTH_PATH, 'na').get(READ, zinc)

			await expect(finCsrfFetch(READ)).rejects.toBeTruthy()
		})

		it('does not request CSRF token if already present', async function (): Promise<void> {
			const options: { headers: { [prop: string]: string } } = {
				headers: {},
			}
			options.headers[SKYARC_ATTEST_KEY] = 'aKey'

			await finCsrfFetch(READ, options)
			expect(fetchMock.called(FIN_AUTH_PATH)).toBe(false)
		})

		it('fetches a CSRF token only once for a single host', async function (): Promise<void> {
			await Promise.all([
				finCsrfFetch(READ),
				finCsrfFetch(READ),
				finCsrfFetch(READ),
				finCsrfFetch(READ),
				finCsrfFetch(READ),
				finCsrfFetch(READ),
			])
			expect(fetchMock.calls(READ).length).toBe(6)
			expect(fetchMock.calls(FIN_AUTH_PATH).length).toBe(1)
		})

		it('fetches two CSRF tokens per origin only once', async function (): Promise<void> {
			await Promise.all([
				finCsrfFetch(READ),
				finCsrfFetch(READ),
				finCsrfFetch(READ),
				finCsrfFetch(ABS_READ),
				finCsrfFetch(ABS_READ),
				finCsrfFetch(ABS_READ),
			])

			expect(fetchMock.calls(READ).length).toBe(3)
			expect(fetchMock.calls(FIN_AUTH_PATH).length).toBe(1)

			expect(fetchMock.calls(ABS_READ).length).toBe(3)
			expect(fetchMock.calls(ABS_FIN_AUTH_PATH).length).toBe(1)
		})

		it('fetches CSRF token with credentials', async function (): Promise<void> {
			await finCsrfFetch(READ)
			expect(fetchMock.lastCall(FIN_AUTH_PATH)?.[1]?.credentials).toBe(
				'include'
			)
		})

		it('fetches CSRF token without cors when original request does not use cors', async function (): Promise<void> {
			await finCsrfFetch(READ)
			expect(fetchMock.lastCall(FIN_AUTH_PATH)?.[1]?.mode).toBeUndefined()
		})

		it('fetches CSRF token with cors when original request uses cors', async function (): Promise<void> {
			await finCsrfFetch(READ, { mode: 'cors' })
			expect(fetchMock.lastCall(FIN_AUTH_PATH)?.[1]?.mode).toBe('cors')
		})

		it('fetches read with no credentials included if already specified', async function (): Promise<void> {
			await finCsrfFetch(READ, { credentials: 'same-origin' })
			expect(fetchMock.lastCall(READ)?.[1]?.credentials).toBe(
				'same-origin'
			)
		})

		it('re-requests CSRF token on 400 response', async function (): Promise<void> {
			const foo = '/foo'
			const invalidCsrfTokenResp = {
				status: 400,
			}
			let count = 0

			fetchMock.get(
				foo,
				(): fetchMock.MockResponse =>
					count++ === 0 ? invalidCsrfTokenResp : zinc
			)

			const resp = await finCsrfFetch(foo)

			const body = await resp.text()
			expect(body).toBe(respGrid.toZinc())
			expect(count).toBe(2)
			expect(fetchMock.calls(FIN_AUTH_PATH).length).toBe(2)
		})
	}) // finCsrfFetch()

	describe('getFinCsrfToken()', function (): void {
		it('returns an empty string for a token that is not found', async function (): Promise<void> {
			expect(await getFinCsrfToken(ABS_URL)).toBe('')
		})

		it('returns a CSRF token for the host', async function (): Promise<void> {
			await finCsrfFetch(READ)
			expect(await getFinCsrfToken(ABS_URL)).toBe('')
		})
	}) // getFinCsrfToken()
})
