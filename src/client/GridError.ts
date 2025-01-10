/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HGrid } from 'haystack-core'

/**
 * An error that encapsulates a grid.
 */
export class GridError extends Error {
	readonly grid: HGrid

	readonly _isGridError = true

	constructor(message: string, grid: HGrid) {
		super(message)
		this.grid = grid
	}

	toGrid(): HGrid {
		return this.grid
	}
}

/**
 * Return ture if the error is a grid error.
 *
 * @param error The error to test.
 * @returns True if the error is a grid error.
 */
export function isGridError(error: unknown): error is GridError {
	return !!(error && (error as GridError)._isGridError)
}
