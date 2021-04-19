/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import {
	HRef,
	HDict,
	HList,
	HGrid,
	valueIsKind,
	Kind,
	HaysonDict,
} from 'haystack-core'

/**
 * Return the id string value from the dict.
 *
 * If an id can't be found then return an empty string.
 *
 * @param dict The dict to get the id from.
 * @returns The id as a string value or an empty string.
 */
export function getId(dict: HDict): string {
	return dict.get<HRef>('id')?.value ?? ''
}

/**
 * Haystack ids
 */
export type Ids =
	| string
	| HRef
	| HDict
	| HGrid
	| string[]
	| HRef[]
	| HDict[]
	| HList<HRef | HDict>

function addRefToArray(ref: HRef, list: string[]): void {
	if (ref.value) {
		list.push(ref.value)
	}
}

function addDictToArray(dict: HDict, list: string[]): void {
	const id = dict.get<HRef>('id')?.value
	if (id) {
		list.push(id)
	}
}

function addDictsToArray(dicts: HDict[], list: string[]): void {
	for (const dict of dicts) {
		addDictToArray(dict, list)
	}
}

/**
 * Convert the ids to an array of id strings.
 *
 * @param ids The ids to create the id array from.
 * @returns An array of id strings.
 */
export function idsToArray(ids: Ids): string[] {
	const array: string[] = []

	if (valueIsKind<HGrid>(ids, Kind.Grid)) {
		addDictsToArray(ids.getRows(), array)
	} else if (valueIsKind<HList<HDict | HRef>>(ids, Kind.List)) {
		for (const id of ids) {
			if (valueIsKind<HDict>(id, Kind.Dict)) {
				addDictToArray(id, array)
			} else {
				addRefToArray(id, array)
			}
		}
	} else if (valueIsKind<HDict>(ids, Kind.Dict)) {
		addDictToArray(ids, array)
	} else if (valueIsKind<HRef>(ids, Kind.Ref)) {
		addRefToArray(ids, array)
	} else if (typeof ids === 'string') {
		array.push(HRef.make(ids).value)
	} else if (Array.isArray(ids)) {
		for (const id of ids) {
			if (valueIsKind<HDict>(id, Kind.Dict)) {
				addDictToArray(id, array)
			} else if (valueIsKind<HRef>(id, Kind.Ref)) {
				addRefToArray(id, array)
			} else {
				array.push(HRef.make(id as string).value)
			}
		}
	} else {
		throw new Error('Unrecognized ids')
	}

	return array
}

/**
 * Return a list of refs from the arguments.
 *
 * @param ids The ids to convert to a list.
 * @returns A list of refs.
 */
export function toIdsList(ids: string[] | HRef[] | HList<HRef>): HList<HRef> {
	return valueIsKind<HList<HRef>>(ids, Kind.List)
		? ids
		: HList.make(
				(ids as string[]).map(
					(val: HRef | string): HRef => HRef.make(val)
				)
		  )
}

/**
 * Convert the dict arguments to a grid.
 *
 * @param dicts The dicts to convert to a grid.
 * @returns A grid containing the dicts.
 */
export function dictsToGrid(
	dicts: HDict | HaysonDict | HDict[] | HaysonDict[] | HGrid | HList<HDict>
): HGrid {
	let grid: HGrid

	if (valueIsKind<HGrid>(dicts, Kind.Grid)) {
		grid = dicts
	} else if (valueIsKind<HList<HDict>>(dicts, Kind.List)) {
		grid = HGrid.make(dicts.values)
	} else if (Array.isArray(dicts)) {
		grid = HGrid.make(dicts)
	} else {
		grid = HDict.make(dicts).toGrid()
	}

	return grid
}

/**
 * Convert an array of ids into an array of dicts with ids.
 *
 * @param ids The ids.
 * @returns An array of dicts with ids.
 */
export function idsToDicts(ids: string[]): HDict[] {
	return ids.map((id: string): HDict => HDict.make({ id: HRef.make(id) }))
}
