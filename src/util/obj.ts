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

/**
 * Replace the keys in the string with values from the object.
 *
 * @param text The text to find and replace on.
 * @param args The arguments.
 * @returns The updated string.
 */
export function replaceKeys(
	text: string,
	args?: Record<string, unknown>
): string {
	let res = text

	if (args) {
		for (const key of Object.keys(args)) {
			res = res.replace(`{{${key}}}`, String(args[key]))
		}
	}

	return res
}
