/*
 * Copyright (c) 2022, J2 Innovations. All Rights Reserved
 */

import { makeDeferred, Deferred } from '../util/promise'

/**
 * The default time to wait before sending the batch request in milliseconds.
 */
const DEFAULT_BATCH_WINDOW_TIMEOUT_MS = 0

/**
 * The function used to batch arguments together and return their results.
 *
 * The returned array size must be the same size as the arguments. If there's
 * an error instead of a return value, an error must be returned for the specified
 * argument.
 */
interface BatcherFunc<ArgType, ReturnType> {
	(args: ArgType[]): Promise<(ReturnType | Error)[]>
}

/**
 * Used for batching asynchronous requests together.
 *
 * The supplied `batcher` function is used to send all the requests together in one
 * go and return the response values.
 */
export class BatchProcessor<ArgType, ReturnType> {
	/**
	 * The internal timer id for keeping track of async activity.
	 */
	#timerId?: NodeJS.Timeout

	/**
	 * The deferred promises.
	 */
	#deferreds: Deferred<ReturnType>[] = []

	/**
	 * The cached arguments.
	 */
	#args: ArgType[] = []

	/**
	 * Time in milliseconds to wait before invoking the `batcher` function.
	 */
	readonly #timeoutWindowMs: number

	/**
	 * A `batcher` function that sends all the arguments together and then returns
	 * all of their results.
	 */
	readonly #batcher: BatcherFunc<ArgType, ReturnType>

	/**
	 * Construct a new batch processor that's used for batching
	 * requests together.
	 *
	 * @param batcher The batcher function that typically makes a network request
	 * with all the supplied arguments and returns the results.
	 * @param timeoutWindowMs Optional timeout window in milliseconds. By
	 * default this is set to zero ms. This is the time used to wait before
	 * invoking the `batcher` function.
	 */
	constructor(
		batcher: BatcherFunc<ArgType, ReturnType>,
		timeoutWindowMs = DEFAULT_BATCH_WINDOW_TIMEOUT_MS
	) {
		this.#batcher = batcher
		this.#timeoutWindowMs = timeoutWindowMs
	}

	/**
	 * Asynchronously invoke an operation with some arguments and return a
	 * promise with the resolved data.
	 *
	 * @param arg The invocation arguments.
	 * @returns The invoked response.
	 */
	invoke(arg: ArgType): Promise<ReturnType> {
		const deferred = makeDeferred<ReturnType>()

		this.#deferreds.push(deferred)
		this.#args.push(arg)

		this.restartBatchTimer()

		return deferred.promise
	}

	/**
	 * Restart the batch poll timer.
	 */
	private restartBatchTimer() {
		clearTimeout(this.#timerId)
		this.#timerId = setTimeout(async (): Promise<void> => {
			const deferreds = this.#deferreds
			const args = this.#args

			this.#deferreds = []
			this.#args = []

			try {
				const returnVals = await this.#batcher(args)

				if (returnVals.length !== args.length) {
					throw new Error(
						'The batcher return and arguments array size must be the same'
					)
				}

				for (let i = 0; i < returnVals.length; ++i) {
					const returnVal = returnVals[i]

					if (returnVal instanceof Error) {
						deferreds[i].reject(returnVal)
					} else {
						deferreds[i].resolve(returnVal)
					}
				}
			} catch (error) {
				for (const deferred of deferreds) {
					deferred.reject(error)
				}
			}
		}, this.#timeoutWindowMs)
	}
}
