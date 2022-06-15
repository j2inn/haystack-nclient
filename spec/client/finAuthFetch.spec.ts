/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

/* eslint @typescript-eslint/no-explicit-any: "off" */

import { clearFinCsrfTokens } from '../../src/client/finCsrfFetch'
import { finAuthFetch } from '../../src/client/finAuthFetch'
import { FIN_AUTH_PATH, FIN_AUTH_KEY } from '../../src/util/http'
import fetchMock from 'fetch-mock'
import { HGrid, HDict } from 'haystack-core'
import {
	Headers,
	Request as NodeRequest,
	RequestInfo as NodeRequestInfo,
} from 'node-fetch'
import { AuthenticationError } from '../../src/errors/AuthenticationError'

describe('finAuthFetch', function (): void {
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

	describe('finAuthFetch()', function (): void {
		it('responds with status 200', async function (): Promise<void> {
			const resp = await finAuthFetch(READ)
			expect(resp.status === 200)
		})

		it('responds with a response body', async function (): Promise<void> {
			const resp = await finAuthFetch(READ)
			const body = await resp.text()
			expect(body).toBe(respGrid.toZinc())
		})

		it('fetches read', async function (): Promise<void> {
			await finAuthFetch(READ)
			expect(fetchMock.called(READ)).toBe(true)
		})

		it('is authenticated', async function (): Promise<void> {
			let triedAuth = false

			await finAuthFetch(READ, {
				authenticator: {
					isAuthenticated: async () => true,
					authenticate: async () => (triedAuth = true),
				},
			})

			expect(triedAuth).toBe(false)
			expect(fetchMock.calls(READ).length).toBe(1)
		})

		it('not authenticated, tries to authenticate, then executes request', async function (): Promise<void> {
			let triedAuth = false

			await finAuthFetch(READ, {
				authenticator: {
					isAuthenticated: async () => false,
					authenticate: async () => (triedAuth = true),
				},
			})

			expect(triedAuth).toBe(true)
			expect(fetchMock.calls(READ).length).toBe(2)
		})

		it('not authenticated, unsuccessful authentication, hits threshold and fails', async function (): Promise<void> {
			let triedAuth = 0
			let authFailed = false

			try {
				await finAuthFetch(READ, {
					authenticator: {
						isAuthenticated: async () => false,
						authenticate: async () => {
							triedAuth++
							return false
						},
						maxTries: 4,
					},
				})
			} catch (error) {
				expect(error).toBeInstanceOf(AuthenticationError)
				authFailed = true
			}

			expect(triedAuth).toBe(4)
			expect(authFailed).toBe(true)
			expect(fetchMock.calls(READ).length).toBe(1)
		})

		it('pre-authenticate, then executes request', async function (): Promise<void> {
			let triedAuth = false

			await finAuthFetch(READ, {
				authenticator: {
					preAuthenticate: async (request: RequestInfo) => {
						return (new NodeRequest(request as NodeRequestInfo, {
							headers: new Headers({ auth: '1234' }),
						}) as unknown) as Request
					},
					isAuthenticated: async () => true,
					authenticate: async () => (triedAuth = true),
				},
			})

			expect(triedAuth).toBe(false)
			expect(fetchMock.calls(READ).length).toBe(1)
			expect(
				((fetchMock.calls(READ)[0].request
					?.headers as unknown) as Headers).get('auth')
			).toBe('1234')
		})

		it('auth error with CSRF failure', async function (): Promise<void> {
			// Kill fetching the CSRF token.
			fetchMock.reset().post(FIN_AUTH_PATH, 'na').get(READ, zinc)

			let authFailed = false
			let triedAuth = false

			try {
				await finAuthFetch(READ, {
					authenticator: {
						// Is authenticated returns true to make a clear distinction
						// that an incoming AuthenticationError from the fetch function
						// starts the authentication process
						isAuthenticated: async () => true,
						authenticate: async () => {
							triedAuth = true
							return false
						},
						maxTries: 4,
					},
				})
			} catch (error) {
				expect(error).toBeInstanceOf(AuthenticationError)
				authFailed = true
			}

			expect(triedAuth).toBe(true)
			expect(authFailed).toBe(true)
		})
	}) // finAuthFetch()
})
