/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import {
	HGrid,
	ZincReader,
	HVal,
	HStr,
	valueIsKind,
	Kind,
	isHVal,
	makeValue,
	HAYSON_MIME_TYPE,
} from 'haystack-core'
import {
	hasHeader,
	addHeader,
	ACCEPT_HEADER,
	ZINC_MIME_TYPE,
	CONTENT_TYPE_HEADER,
} from '../util/http'
import { GridError } from './GridError'

export const HS_ACCEPT_HEADER_VALUE = `${ZINC_MIME_TYPE},${HAYSON_MIME_TYPE}`

export interface FetchMethod {
	(
		resource: RequestInfo,
		options?: RequestInit | undefined
	): Promise<Response>
}

/**
 * Validate the haystack value.
 *
 * @param hval The value to validate or a decoded string.
 * @returns The haystack value.
 * @throws Throws an error if we don't have a valid haystack value.
 */
export function validateValue<Value extends HVal>(
	val: Value | string | undefined | null,
	resp: Response
): Value {
	// 1. First check to see if the decoded value is a grid with an error.
	if (valueIsKind<HGrid>(val, Kind.Grid)) {
		// Throw an error if the returned grid contains one.
		const err = val.getError()
		if (err) {
			throw new GridError(err.dis, val)
		}
	}

	// 2. Check response codes and throw an error with anything read.
	if (resp.status !== 200 && resp.status !== 201) {
		throw new Error(
			val ? String(val) : 'Error in decoding haystack response'
		)
	}

	// 3. Check we do have a haystack value decoded.
	if (!isHVal(val)) {
		throw new Error('Unable to decode haystack value')
	}

	return val
}

async function parseResponse(resp: Response): Promise<HVal | undefined | null> {
	const contentType = resp.headers.get(CONTENT_TYPE_HEADER)

	if (contentType?.includes(HAYSON_MIME_TYPE)) {
		return makeValue(await resp.json())
	} else if (contentType?.includes(ZINC_MIME_TYPE)) {
		return ZincReader.readValue(await resp.text())
	} else {
		return HStr.make(await resp.text())
	}
}

/**
 * Reads a grid from a response.
 *
 * @param resp The response to read.
 * @returns The read grid.
 */
async function readVal<Value extends HVal>(resp: Response): Promise<Value> {
	const val = (await parseResponse(resp)) as Value
	return validateValue<Value>(val as Value | null | undefined, resp)
}

/**
 * Make some haystack value options.
 *
 * @param options The fetch options.
 * @returns The updated fetch optons.
 */
export function makeHsOptions(options?: RequestInit): RequestInit {
	const hsOptions: RequestInit = options ?? {}

	// Always include the credentials if not specified.
	if (!hsOptions.credentials) {
		hsOptions.credentials = 'include'
	}

	// Default accept header for Hayson and Zinc.
	if (!hasHeader(hsOptions.headers, ACCEPT_HEADER)) {
		addHeader(hsOptions, ACCEPT_HEADER, HS_ACCEPT_HEADER_VALUE)
	}

	// Automatically add the content type if not specified.
	// Base it on the inspecting the body.
	if (!hasHeader(hsOptions.headers, CONTENT_TYPE_HEADER) && hsOptions?.body) {
		addHeader(
			hsOptions,
			CONTENT_TYPE_HEADER,
			String(hsOptions?.body).startsWith('ver')
				? ZINC_MIME_TYPE
				: HAYSON_MIME_TYPE
		)
	}

	return hsOptions
}

/**
 * Convience method to fetch a haystack value from the server.
 *
 * If the returned value is a grid and has an error then the returned promise
 * will be rejected with a `GridError` instance.
 *
 * @param resource The resource to request.
 * @param options Optional object containing any custom settings.
 * @param fetchFunc Optional fetch function to use instead of global fetch.
 * @returns A promise that resolves to a value.
 * @throws A fetch or grid error.
 */
export async function fetchVal<T extends HVal>(
	resource: RequestInfo,
	options?: RequestInit,
	fetchFunc?: FetchMethod
): Promise<T> {
	// If there is `fetch` specified in the options then use it instead of global fetch.
	// This enables `fetch` to be cross cut and have different behaviors injected into it.
	const fetchImpl = fetchFunc ?? fetch
	return readVal(await fetchImpl(resource, makeHsOptions(options)))
}
