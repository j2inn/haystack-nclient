/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HList, HRef, Kind, valueIsKind } from 'haystack-core'

/**
 * @module HTTP utility methods.
 */

/**
 * Returns the URL for an general API.
 *
 * @param params.origin The origin.
 * @param params.path The path prefix to use.
 * @returns A URL.
 */
export const getServiceUrl: getServiceUrlCallback = ({
	origin,
	path,
}): string => `${origin}/api/${path}`

/**
 * The functional interface for getting the origin API url.
 */
export interface getServiceUrlCallback {
	({ origin, path }: { origin: string; path: string }): string
}

/**
 * The functional interface for getting the op url.
 */
export interface getOpUrlCallback {
	({
		origin,
		pathPrefix,
		project,
		op,
	}: {
		origin: string
		pathPrefix: string
		project: string
		op: string
	}): string
}

/**
 * Returns the URL for an op.
 *
 * @param params.origin The origin.
 * @param params.pathPrefix The path prefix to use.
 * @param params.project The project name.
 * @param params.op The op name.
 * @returns A URL.
 */
export const getOpUrl: getOpUrlCallback = ({
	origin,
	pathPrefix,
	project,
	op,
}): string => `${origin}${pathPrefix}/api/${project}/${op}`

/**
 * The functional interface for getting the op url.
 */
export interface getHaystackServiceUrlCallback {
	({
		origin,
		pathPrefix,
		project,
		path,
	}: {
		origin: string
		pathPrefix: string
		project: string
		path: string
	}): string
}

/**
 * Returns the URL for a Haystack REST service.
 *
 * @param origin The origin for the service.
 * @param pathPrefix The path prefix to use.
 * @param project The project for the service. May be empty and if so shouldn't be included.
 * @param path The service path.
 * @returns A URL.
 */
export const getHaystackServiceUrl: getHaystackServiceUrlCallback = ({
	origin,
	pathPrefix,
	project,
	path,
}): string =>
	`${origin}${pathPrefix}/api/haystack${project ? `/${project}` : ''}/${path}`

/**
 * The functional interface for getting the op url.
 */
export interface getHostServiceUrlCallback {
	({
		origin,
		pathPrefix,
		path,
	}: {
		origin: string
		pathPrefix: string
		path: string
	}): string
}

/**
 * Returns the URL for a Host REST service.
 *
 * @param origin The origin for the service.
 * @param pathPrefix The path prefix to use.
 * @param path The service path.
 * @returns A URL.
 */
export const getHostServiceUrl: getHostServiceUrlCallback = ({
	origin,
	pathPrefix,
	path,
}): string => `${origin}${pathPrefix}/api/host/${path}`

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
 * Adds a starting slash and removes any ending slash.
 *
 * @param path The path to update.
 * @returns The updated path.
 */
export function addStartSlashRemoveEndSlash(path: string): string {
	path = path.trim()

	if (path && !path.startsWith('/')) {
		path = `/${path}`
	}

	if (path.endsWith('/')) {
		path = path.substring(0, path.length - 1)
	}

	return path
}
