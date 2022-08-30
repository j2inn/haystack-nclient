/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

/**
 * A deferred promise.
 */
export interface Deferred<PromiseType = void> {
	promise: Promise<PromiseType>
	resolve: (value: PromiseType) => void
	reject: (reason?: unknown) => void
}

/**
 * @returns A new deferred promise.
 */
export function makeDeferred<PromiseType = void>(): Deferred<PromiseType> {
	const deferred: Deferred<PromiseType> =
		{} as unknown as Deferred<PromiseType>

	deferred.promise = new Promise<PromiseType>(
		(
			resolve: (value: PromiseType) => void,
			reject: (reason?: unknown) => void
		): void => {
			deferred.resolve = resolve
			deferred.reject = reject
		}
	)

	return deferred
}
