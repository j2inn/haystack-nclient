/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

/**
 * Delete an object's properties.
 *
 * @param obj The object to clear of properties.
 */
export function clear(obj: { [prop: string]: unknown }): void {
	for (const key of Object.keys(obj)) {
		delete obj[key]
	}
}
