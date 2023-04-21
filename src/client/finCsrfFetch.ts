/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

/* eslint @typescript-eslint/no-explicit-any: "off" */

import {
	getHeader,
	hasHeader,
	addHeader,
	getOrigin,
	FIN_AUTH_PATH,
	FIN_AUTH_KEY,
	SKYARC_ATTEST_KEY,
	removeHeader,
} from '../util/http'
import { FetchMethod } from './fetchVal'

/**
 * The http status code for an invalid attest key.
 */
const INVALID_ATTEST_KEY_STATUS = 400

/**
 * A map that holds cached attest keys promises (CSRF tokens) to use
 * in any potential HTTP requests.
 */
const originAttestKeyPromises: Map<string, Promise<string>> = new Map()

/**
 * Represents a CSRF error.
 */
export class CsrfError extends Error {
	/**
	 * Used for a type guard check.
	 */
	readonly _isCsrfError = true

	/**
	 * HTTP response code.
	 */
	readonly status: number

	constructor(response: Response, message?: string) {
		super(message || response.statusText)
		this.status = response.status
	}
}

/**
 * A type guard for an CSRF error.
 *
 * @param value The value to check.
 * @returns The result of the type guard check.
 */
export function isCsrfError(value: unknown): value is CsrfError {
	return !!(value as CsrfError)?._isCsrfError
}

/**
 * Clear any cached CSRF tokens.
 *
 * Calling this will force all CSRF tokens to be re-requested on subsequent network calls.
 */
export function clearFinCsrfTokens(): void {
	originAttestKeyPromises.clear()
}

/**
 * Asynchronously return the CSRF token for the specified host.
 *
 * @param host The host.
 * @returns Resolves to the CSRF token or an empty string if it can't be found.
 */
export async function getFinCsrfToken(host: string): Promise<string> {
	return originAttestKeyPromises.get(host) ?? ''
}

/**
 * Asynchronously request the attest key from a server.
 *
 * @param origin The origin to request the attest key from.
 * @param options The `fetch` options to use when making an HTTP request.
 * @param fetchFunc Fetch function to use instead of global fetch.
 * @returns A promise that resolves to the attest key or an empty string.
 * @throws Error if we cannot obtain the key.
 */
async function requestFinAttestKey(
	origin: string,
	options: RequestInit,
	fetchFunc: FetchMethod
): Promise<string> {
	const opt: RequestInit = {
		...options,
		method: 'POST',
		credentials: 'include',
	}

	const attestRequestUri = isCsrfRequestInit(options)
		? options.attestRequestUri ?? FIN_AUTH_PATH
		: FIN_AUTH_PATH

	const attestResponseHeaderName = isCsrfRequestInit(options)
		? options.attestResponseHeaderName ?? FIN_AUTH_KEY
		: FIN_AUTH_KEY

	const resp = await fetchFunc(`${origin}${attestRequestUri}`, opt)
	const auth = getHeader(resp.headers, attestResponseHeaderName)

	if (!auth) {
		throw new CsrfError(resp, 'Cannot acquire attest key')
	}

	return auth
}

/**
 * Asynchronously return the attest key for the specified header.
 *
 * @param resource The resource being request.
 * @param cors Indicates whether the originating request was using cors.
 * @param fetchFunc Fetch function to use instead of global fetch.
 * @returns A promise that resolves to the attest key.
 */
async function getAttestKey(
	resource: string,
	options: RequestInit,
	fetchFunc: FetchMethod
): Promise<string> {
	const host = getOrigin(resource)
	let promise = originAttestKeyPromises.get(host)

	if (!promise) {
		// Cache the promise to get the attest key. This handles
		// multiple requests being concurrently made on start up.
		promise = requestFinAttestKey(
			host,
			options,
			fetchFunc
		) as Promise<string>
		originAttestKeyPromises.set(host, promise)
	}

	try {
		return await promise
	} catch (err) {
		// If the promise fails then clear the entry from the cache so it can be requested again in future.
		originAttestKeyPromises.delete(host)
		throw err
	}
}

/**
 * Clear the cached attest key.
 *
 * @param resource The resouce being sent.
 */
function clearAttestKey(resource: string): void {
	originAttestKeyPromises.delete(getOrigin(resource))
}

/**
 * An enhanced fetch API for CSRF token management with the FIN framework.
 *
 * Transparently handles CSRF token management (a.k.a. attest keys) and provides additional
 * features for working with haystack data.
 *
 * @link https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
 *
 * @param resource The resource to request.
 * @param options Optional object containing any custom settings.
 * @param fetchFunc Optional fetch function to use instead of global fetch.
 * @returns A promise that resolves to a response object.
 */
export async function finCsrfFetch(
	resource: RequestInfo,
	options?: RequestInit,
	fetchFunc?: FetchMethod
): Promise<Response> {
	const hsOptions: RequestInit = options ?? {}
	const attestHeaderName = isCsrfRequestInit(options)
		? options.attestHeaderName ?? SKYARC_ATTEST_KEY
		: SKYARC_ATTEST_KEY

	const fetchImpl = fetchFunc ?? fetch

	async function addAttestKeyHeader(): Promise<boolean> {
		removeHeader(hsOptions.headers, attestHeaderName)

		const attestKey = await getAttestKey(
			String(resource),
			hsOptions,
			fetchImpl
		)

		// Only add the attest key if we have one. Some haystack servers may not use this key.
		if (attestKey) {
			addHeader(hsOptions, attestHeaderName, attestKey)
			return true
		} else {
			return false
		}
	}

	let hasAttestKey = hasHeader(hsOptions.headers, attestHeaderName)

	// Lazily add the attest key to this request if not already specified.
	if (!hasAttestKey) {
		await addAttestKeyHeader()
		hasAttestKey = true
	}

	let resp = await fetchImpl(resource, hsOptions)

	// If we get a 400 response back then it's likely the attest key is no longer
	// valid. Perhaps the server has restarted. In this case, clear the attest key
	// and attempt to re-request it.
	if (resp.status === INVALID_ATTEST_KEY_STATUS && hasAttestKey) {
		clearAttestKey(String(resource))

		if (await addAttestKeyHeader()) {
			resp = await fetchImpl(resource, hsOptions)
		}
	}

	return resp
}

export interface CsrfRequestInit extends RequestInit {
	attestHeaderName?: string
	attestRequestUri?: string
	attestResponseHeaderName?: string
}

export function isCsrfRequestInit(
	value?: RequestInit
): value is CsrfRequestInit {
	return !!value && 'attestHeaderName' in value
}
