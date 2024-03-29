/*
 * Copyright (c) 2022, J2 Innovations. All Rights Reserved
 */

import { makeDeferred, Deferred } from '../util/promise'

/**
 * The default time to wait before sending the batch request in milliseconds.
 */
const DEFAULT_BATCH_WINDOW_TIMEOUT_MS = 0

/**
 * The default batch limit.
 */
const DEFAULT_BATCH_LIMIT = 100

/**
 * The function used to batch arguments together and return their results.
 *
 * The returned array size must be the same size as the arguments. If there's
 * an error instead of a return value, an error must be returned for the specified
 * argument.
 */
export interface BatcherFunc<ArgType, ReturnValueType> {
	(args: ArgType[]): Promise<(ReturnValueType | Error)[]>
}

/**
 * A capture invocation.
 */
interface Invocation<ArgType, ReturnValueType> {
	/**
	 * The invocation for the argument.
	 */
	arg: ArgType

	/**
	 * The deferred promise to be resolved at some point.
	 */
	deferred: Deferred<ReturnValueType>
}

/**
 * Used for batching asynchronous requests together.
 *
 * The supplied `batcher` function is used to send all the requests
 * together in one go and return the response values.
 *
 * ```typescript
 * const batcher = async (values: string[]): Promise<string[]> => makeMyNetworkRequest(values)
 * ...
 * const processor = new BatchProcessor<string, string>({ batcher })
 * ...
 * await Promise.all([
 *   processor.invoke('foo'),
 *   processor.invoke('bar'),
 *   processor.invoke('today')
 * ])
 * ```
 */
export class BatchProcessor<ArgType, ReturnValueType> {
	/**
	 * The internal timer id for keeping track of async activity.
	 */
	#timerId?: ReturnType<typeof setTimeout>

	/**
	 * The cached invocations to batch.
	 */
	#invocations: Invocation<ArgType, ReturnValueType>[] = []

	/**
	 * A `batcher` function that sends all the arguments together and then returns
	 * all of their results.
	 */
	readonly #batcher: BatcherFunc<ArgType, ReturnValueType>

	/**
	 * Time in milliseconds to wait before invoking the `batcher` function.
	 */
	readonly #timeoutWindowMs: number

	/**
	 * The limit on the number of arguments sent to a batcher in one go.
	 */
	readonly #limit: number

	/**
	 * Construct a new batch processor that's used for batching
	 * requests together.
	 *
	 * @param options.batcher The batcher function that typically makes a network request
	 * with all the supplied arguments and returns the results. Each result can either
	 * be the expected result or an Error object.
	 * @param options.timeoutWindowMs Optional timeout window in milliseconds. By
	 * default this is set to zero ms. This is the time used to wait before
	 * invoking the `batcher` function.
	 * @param options.limit Optional number of arguments limit in one call to the batcher
	 * function. For instance, if the limit is 10 and there are 100 arguments batched
	 * then the batcher will be called 10 times with 10 arguments each time.
	 * By default, this is set to 100.
	 */
	constructor({
		batcher,
		timeoutWindowMs = DEFAULT_BATCH_WINDOW_TIMEOUT_MS,
		limit = DEFAULT_BATCH_LIMIT,
	}: {
		batcher: BatcherFunc<ArgType, ReturnValueType>
		timeoutWindowMs?: number
		limit?: number
	}) {
		this.#batcher = batcher
		this.#timeoutWindowMs = timeoutWindowMs
		this.#limit = limit
	}

	/**
	 * Asynchronously invoke an operation with some arguments and return a
	 * promise with the resolved data.
	 *
	 * @param arg The invocation arguments.
	 * @returns The invoked response.
	 */
	invoke(arg: ArgType): Promise<ReturnValueType> {
		const deferred = makeDeferred<ReturnValueType>()

		this.#invocations.push({ arg, deferred })

		this.restartBatchTimer()

		return deferred.promise
	}

	/**
	 * Restart the batch poll timer.
	 */
	private restartBatchTimer() {
		clearTimeout(this.#timerId)
		this.#timerId = setTimeout(async (): Promise<void> => {
			const invocationList = this.getInvocationsByLimit()
			this.#invocations = []

			for (const invocations of invocationList) {
				if (invocations.length > 0) {
					try {
						const returnVals = await this.#batcher(
							invocations.map((inv) => inv.arg)
						)

						if (returnVals.length !== invocations.length) {
							throw new Error(
								'The batcher return and arguments array size must be the same'
							)
						}

						for (let i = 0; i < returnVals.length; ++i) {
							const returnVal = returnVals[i]

							if (returnVal instanceof Error) {
								invocations[i].deferred.reject(returnVal)
							} else {
								invocations[i].deferred.resolve(returnVal)
							}
						}
					} catch (error) {
						for (const { deferred } of invocations) {
							deferred.reject(error)
						}
					}
				}
			}
		}, this.#timeoutWindowMs)
	}

	/**
	 * Return a list of invocations bounded by a limit.
	 *
	 * @returns A list of invocations.
	 */
	private getInvocationsByLimit(): Invocation<ArgType, ReturnValueType>[][] {
		const list: Invocation<ArgType, ReturnValueType>[][] = []

		let count = 0

		while (count < this.#invocations.length) {
			const upper = count + this.#limit
			const args = this.#invocations.slice(count, upper)

			if (args.length) {
				list.push(args)
			}

			count = upper
		}

		return list
	}
}
