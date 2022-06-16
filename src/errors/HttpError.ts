/*
 * Copyright (c) 2022, J2 Innovations. All Rights Reserved
 */

/**
 * Global http error symbol used for type checking
 */
const HttpErrorSymbol = Symbol.for('HttpError')

export class HttpError extends Error {
	[HttpErrorSymbol] = 0

	/**
	 * HTTP Response that was executing when this error was thrown
	 */
	public readonly response: Response

	/**
	 * returns true if the error was thrown during an authentication process
	 */
	public readonly isAuthenticationError: boolean

	constructor(
		response: Response,
		message?: string,
		isAuthenticationError?: boolean
	) {
		super(message ?? response.statusText)
		this.response = response
		this.isAuthenticationError = isAuthenticationError ?? false
	}

	/**
	 * Returns HTTP Status Code
	 */
	public get statusCode(): number {
		return this.response.status
	}
}

export function isHttpError(value: unknown): value is HttpError {
	return Object.getOwnPropertySymbols(value).includes(HttpErrorSymbol)
}
