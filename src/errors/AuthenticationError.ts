/*
 * Copyright (c) 2022, J2 Innovations. All Rights Reserved
 */

/**
 * Global authentication error symbol used for type checking
 */
const AuthenticationErrorSymbol = Symbol.for('AuthenticationError')

export class AuthenticationError extends Error {
	[AuthenticationErrorSymbol] = 0

	/**
	 * Error that caused this authentication error to occur
	 */
	public readonly cause: Error | undefined
	constructor(cause?: Error, message?: string) {
		super(message ?? cause?.message)
		this.cause = cause
	}
}

export function isAuthenticationError(
	value: unknown
): value is AuthenticationError {
	return Object.getOwnPropertySymbols(value).includes(
		AuthenticationErrorSymbol
	)
}
