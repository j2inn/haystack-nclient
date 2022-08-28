/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import {
	HDict,
	HGrid,
	HMarker,
	Kind,
	valueIsKind,
	ZincReader,
} from 'haystack-core'
import { FetchMethod, makeHsOptions, validateResponse } from './fetchVal'

/**
 * Validate the value to ensure it's a grid.
 *
 * @param hval The value to validate or a decoded string.
 * @returns The haystack value.
 * @throws Throws an error if we don't have a valid haystack value.
 */
function validateGrid(val: unknown): HGrid {
	return valueIsKind<HGrid>(val, Kind.Grid)
		? val
		: new HGrid({
				meta: new HDict({
					err: HMarker.make(),
					dis: 'Expected grid in response',
				}),
		  })
}

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
	validateResponse(resp)

	// Please note, due to each grid being a separate part of the response object,
	// this should probably be always encoded in Zinc and never JSON.

	const zincReader = new ZincReader(await resp.text())
	const allGrids: HGrid[] = []

	for (let i = 0; i < gridCount; ++i) {
		allGrids.push(validateGrid(zincReader.readValue()))
	}

	return allGrids
}

/**
 * Convenience method to fetch multiple grids from a response.
 *
 * A caller will have to check each grid to see if it's in error.
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
 * @throws A fetch error.
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
