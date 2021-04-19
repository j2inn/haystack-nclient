/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HList, HRef, Kind, valueIsKind } from 'haystack-core'

/**
 * @module HTTP utility methods.
 */

/**
 * Returns the URL for an op.
 *
 * @param origin The origin for the op.
 * @param opsBase The base ops path.
 * @param project The project for the op.
 * @param op The op to create the URL for.
 * @returns A URL.
 */
export function getOpUrl(
	origin: string,
	prefix: string,
	opsBase: string,
	project: string,
	op: string
): string {
	return `${origin}${
		prefix ? '/' + sanitizedPrefixPath(prefix) : ''
	}/${opsBase}/${project || 'sys'}/${op}`
}

/**
 * Returns the URL for a Haystack REST service.
 *
 * @param origin The origin for the service.
 * @param project The project for the service.
 * @param path The service path.
 * @returns A URL.
 */
export function getHaystackServiceUrl(
	origin: string,
	prefix: string,
	project: string,
	path: string
): string {
	return `${origin}${
		prefix ? '/' + sanitizedPrefixPath(prefix) : ''
	}/api/haystack${project ? `/${project}` : ''}/${path}`
}

/**
 * Returns the URL for a Host REST service.
 *
 * @param origin The origin for the service.
 * @param path The service path.
 * @returns A URL.
 */
export function getHostServiceUrl(
	origin: string,
	prefix: string,
	path: string
): string {
	return `${origin}${
		prefix ? '/' + sanitizedPrefixPath(prefix) : ''
	}/api/host/${path}`
}

/**
 * Encode the object as a URI query segment.
 *
 * https://en.wikipedia.org/wiki/Uniform_Resource_Identifier
 *
 * @param obj The object to encode.
 * @returns A query or empty string if there's noting to encode.
 */
export function encodeQuery(
	obj: Record<
		string,
		| string
		| HRef
		| number
		| string[]
		| HRef[]
		| HList<HRef>
		| boolean
		| undefined
	>
): string {
	let query = ''

	for (const key of Object.keys(obj)) {
		const value = obj[key]

		if (value !== undefined) {
			if (!query) {
				query = '?'
			} else {
				query += `&`
			}

			let encodedValue: string

			if (valueIsKind<HRef>(value, Kind.Ref)) {
				encodedValue = value.value
			} else if (valueIsKind<HList<HRef>>(value, Kind.List)) {
				encodedValue = value.values.map((val) => val.value).join('|')
			} else {
				encodedValue = Array.isArray(value)
					? value.join('|')
					: String(value)
			}

			query += `${key}=${encodeURIComponent(encodedValue)}`
		}
	}

	return query
}

/**
 * The CSRF key that needs to be added to all outgoing writable requests.
 */
export const SKYARC_ATTEST_KEY = 'skyarc-attest-key'

/**
 * The FIN authorization key that contains a requested CSRF key.
 */
export const FIN_AUTH_KEY = 'fin-stack-auth'

/**
 * The FIN authorization path to request a CSRF token.
 */
export const FIN_AUTH_PATH = '/finStackAuth'

/**
 * The HTTP accept header.
 */
export const ACCEPT_HEADER = 'accept'

/**
 * The HTTP content type header.
 */
export const CONTENT_TYPE_HEADER = 'content-type'

/**
 * The zinc mime type.
 */
export const ZINC_MIME_TYPE = 'text/zinc'

/**
 * Return the origin for the specified resource.
 *
 * If the path is relative then an empty string is returned.
 *
 * @param resource The resouce to get the host from.
 * @returns The host.
 */
export function getOrigin(resource: string): string {
	try {
		return new URL(resource).origin
	} catch (err) {
		return ''
	}
}

/**
 * Return true if the target is a valid headers object.
 *
 * @param headers The headers object to test.
 * @returns True if the target is a headers object.
 */
function isHeaders(headers: HeadersInit | undefined): headers is Headers {
	return !!(
		headers &&
		typeof headers.entries === 'function' &&
		typeof headers.keys === 'function' &&
		typeof headers.values === 'function'
	)
}

/**
 * An object literal for http headers.
 */
export interface HeadersObj {
	[prop: string]: string
}

/**
 * Return true if the headers object has the specified header.
 *
 * @param headers The headers object.
 * @param headerName The header name to look for.
 * @returns True if the header is present.
 */
export function hasHeader(
	headers: HeadersInit | undefined,
	headerName: string
): boolean {
	if (!headers) {
		return false
	}

	// Handle Headers object.
	if (isHeaders(headers)) {
		return headers.has(headerName)
	}

	// Handle object literal.
	const header = headerName.toLowerCase()
	for (const name in headers) {
		if (name.toLowerCase() === header) {
			return true
		}
	}

	return false
}
/**
 * Return the header value from the headers object. Return undefined if the
 * value can't be found.
 *
 * @param headers The headers object.
 * @param headerName The headers name to look for.
 * @returns The header value as a string or undefined if it can't be found.
 */
export function getHeader(
	headers: HeadersInit | undefined,
	headerName: string
): string | undefined {
	if (!headers) {
		return undefined
	}

	// Handle Headers object.
	if (isHeaders(headers)) {
		return headers.get(headerName) ?? undefined
	}

	// Handle object literal.
	const header = headerName.toLowerCase()
	for (const name in headers) {
		if (name.toLowerCase() === header) {
			return (headers as HeadersObj)[name] as string
		}
	}

	return undefined
}
/**
 * Add the header and its value to an options object.
 *
 * @param options The options object that has a headers object.
 * @param headerName The header name.
 * @param headerValue The header value.
 */
export function addHeader(
	options: RequestInit,
	headerName: string,
	headerValue: string
): void {
	if (isHeaders(options.headers)) {
		options.headers.set(headerName, headerValue)
	} else {
		const headers = (options.headers ??
			(options.headers = {})) as HeadersObj
		headers[headerName] = headerValue
	}
}

/**
 * Removes the slashes form the start and end of a string/path
 *
 * @param path is the path string
 * @returns {string}
 */
export function sanitizedPrefixPath(path?: string): string {
	if (!path || path.trim().length < 1) {
		return ''
	}

	return path.replace(/^\/+|\/+$/g, '')
}
