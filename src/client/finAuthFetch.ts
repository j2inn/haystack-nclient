/*
 * Copyright (c) 2022, J2 Innovations. All Rights Reserved
 */

import { finCsrfFetch, isCsrfError } from './finCsrfFetch'
import { FetchMethod } from './fetchVal'

/**
 * A general authentication error.
 */
export class AuthenticationError extends Error {
	/**
	 * Used for a type guard check.
	 */
	readonly _isAuthenticationError = true

	/**
	 * Error that caused this authentication error to occur
	 */
	readonly cause: Error | undefined

	constructor(cause?: Error, message?: string) {
		super(message ?? cause?.message)
		this.cause = cause
	}
}

/**
 * A type guard for an authentication error.
 *
 * @param value The value to check.
 * @returns The result of the type guard check.
 */
export function isAuthenticationError(
	value: unknown
): value is AuthenticationError {
	return !!(value as AuthenticationError)?._isAuthenticationError
}

/**
 * The default fallback fetch method.
 */
const defaultFetch = finCsrfFetch

/**
 * An enhanced fetch API for a pluggable authentication mechanism.
 *
 * Transparently handles pre-authentication, authentication fault detection, authentication, and
 * will replay the requested resource upon successful authentication.
 *
 * By default, this fetch function will utilize the finCsrfFetch function internally to execute the request.
 *
 * For example...
 *
 * ```typescript
 * const result = finAuthFetch(request, {
 * 		authenticator: {
 * 			isAuthenticated: (response: Response) => response.status !== 401,
 *			preauthenticate: async (request: RequestInfo) => new Request(request, {headers: {auth_header: '12345'}}),
 *			authenticate: (response: Response) => return execute_authentication(username, password),
 *			maxTries: 3
 * 	}
 * })
 * ```
 *
 * @link https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
 *
 * @param resource The resource to request.
 * @param options Optional object containing custom settings and the authenticator.
 * @returns A promise that resolves to a response object.
 * @throws Exception on failed authentication
 */
export async function finAuthFetch(
	resource: RequestInfo,
	options?: RequestInit | RequestInitAuth
): Promise<Response> {
	let resp: Response | undefined

	let fetchMethod = defaultFetch

	if (options && isAuthInit(options)) {
		const authenticator = options.authenticator as RequestAuthenticator

		// Pre authenticate if suppprted by authenticator
		if (authenticator.preAuthenticate) {
			resource = await authenticator.preAuthenticate(resource, options)
		}

		fetchMethod = options.fetch ?? defaultFetch

		// Pipe request to the fetch method
		try {
			resp = await fetchMethod(resource, options)

			// Check if response is an authentication fault
			if (!(await authenticator.isAuthenticated?.(resp))) {
				throw new AuthenticationError(
					new Error('Request not authenticated')
				)
			}

			// Response was already authenticated, return response
			return resp
		} catch (error) {
			if (isCsrfError(error) || isAuthenticationError(error)) {
				// An http error was thrown, attempt to authenticate
				const authSuccessful = await authenticateResponse(
					resp as Response,
					options
				)

				// if authentication failed, throw authentication error
				if (!authSuccessful) {
					throw new AuthenticationError(
						new Error('Authentication failed')
					)
				}
			} else {
				throw error
			}
		}
	}

	// If request doesn't contain an authenticator or authentication was successful, play request.
	resp = await fetchMethod(resource, options)

	return resp
}

async function authenticateResponse(
	response: Response,
	options?: RequestInitAuth
): Promise<boolean> {
	const authenticator = options?.authenticator

	if (!authenticator) {
		return false
	}

	const maxTries = authenticator.maxTries ?? 3
	let authSuccessful = false

	// Attempt to authenticate until we have reached the max try threshold
	for (let i = 0; i < maxTries; i++) {
		const result = await authenticator.authenticate(response, options)

		if (result) {
			authSuccessful = true
			break
		}
	}

	return authSuccessful
}

/**
 * Request Init with Authenticator
 */
export interface RequestInitAuth extends RequestInit {
	/**
	 * Request Authenticator
	 */
	authenticator?: RequestAuthenticator

	/**
	 * Pluggable fetch API function
	 *
	 * @link https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
	 *
	 * @param resource The resource to request.
	 * @param options Optional object containing any custom settings.
	 * @returns A promise that resolves to a response object.
	 */
	fetch?: FetchMethod
}

/**
 * Request Authenticator
 * @interface
 */
export interface RequestAuthenticator {
	/**
	 * Is Authenticated
	 *
	 * This function checkes the response and should determine if the response is returning an authentication fault
	 *
	 * @param response Response that authentication test should be ran against
	 * @retuns true if the response is already authenticated
	 */
	isAuthenticated: (response: Response) => Promise<boolean>

	/**
	 * Pre-Authenticate
	 *
	 * This optional function is used to pre authenticate a request. For example in the case the request
	 * is authenticated via a token.
	 *
	 * @param request to pre authenticate
	 * @returns Pre authenticated Request Object
	 */
	preAuthenticate?: (
		request: RequestInfo,
		options?: RequestInit
	) => Promise<Request>

	/**
	 * Authenticate
	 *
	 * This function is used to request authentication. This is where the authentication mechanism is handled.
	 *
	 * @param Response to authenticate
	 * @returns true if authentication was successful
	 */
	authenticate: (
		response: Response,
		options?: RequestInit
	) => Promise<boolean>

	/**
	 * Maximum Tries
	 *
	 * Number of failed authentication attempts before giving up.
	 * @default 3
	 */
	maxTries?: number
}

function isAuthInit(init: RequestInit): init is RequestInitAuth {
	return 'authenticator' in init
}
