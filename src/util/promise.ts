/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

/**
 * A deferred promise.
 */
export interface Deferred {
	promise?: Promise<void>
	resolve?: () => void
	reject?: (reason?: unknown) => void
}

/**
 * @returns A new deferred promise.
 */
export function makeDeferred(): Deferred {
	const deferred: Deferred = {}

	deferred.promise = new Promise(
		(resolve: () => void, reject: (reason?: unknown) => void): void => {
			deferred.resolve = resolve
			deferred.reject = reject
		}
	)

	return deferred
}
