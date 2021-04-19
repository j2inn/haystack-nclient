/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HGrid, ZincReader } from 'haystack-core'
import { FetchMethod, makeHsOptions, validateValue } from './fetchVal'

/**
 * Reads a number of grids from a response.
 *
 * @param resp The response to read the grids from.
 * @param gridCount The number of expected grids to read in the response.
 * @returns The read grids.
 */
async function readAllGrids(
	resp: Response,
	gridCount: number
): Promise<HGrid[]> {
	// Please note, due to each grid being a separate part of the response object,
	// this should probably be always encoded in Zinc and never JSON.

	const zincReader = new ZincReader(await resp.text())
	const allGrids: HGrid[] = []

	for (let i = 0; i < gridCount; ++i) {
		allGrids.push(validateValue(zincReader.readValue(), resp) as HGrid)
	}

	return allGrids
}

/**
 * Convience method to fetch multiple grids from a response.
 *
 * If the returned grid has an error then the returned promise
 * will be rejected with a `GridError` instance.
 *
 * Please note: fetching multiple grids from a response is unorthodox. This
 * was added to support the rather antiquated `evalAll` that has multiple grids
 * encoded into its response.
 *
 * @param resource The resource to request.
 * @param gridCount The number of expected grids to read.
 * @param options Optional object containing any custom settings.
 * @param fetchFunc Optional fetch function to use instead of global fetch.
 * @returns A promise that resolves to a number of grids.
 * @throws A fetch or grid error.
 */
export async function fetchAllGrids(
	resource: RequestInfo,
	gridCount: number,
	options?: RequestInit,
	fetchFunc?: FetchMethod
): Promise<HGrid[]> {
	if (gridCount <= 0) {
		throw new Error('Must request one of more grids')
	}

	const fetchImpl = fetchFunc ?? fetch

	return readAllGrids(
		await fetchImpl(resource, makeHsOptions(options)),
		gridCount
	)
}
