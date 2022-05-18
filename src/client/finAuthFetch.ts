import { finCsrfFetch } from './finCsrfFetch'

/**
 * An enhanced fetch API for a pluggable authentication mechanism
 *
 * Transparently handles pre-authentication, authentication fault detection, authentication, and
 * will replay the requested resource upon successful authentication.
 *
 * This fetch function will utilize the finCsrfFetch function internally to execute the request
 *
 * Example
 * ```typescript
 *
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

	if (options && isAuthInit(options)) {
		const authenticator = options.authenticator as RequestAuthenticator

		// Pre authenticate if suppprted by authenticator
		if (authenticator.preauthenticate) {
			resource = await authenticator.preauthenticate(resource)
		}

		// Pipe request to the csrf fetch function
		resp = await finCsrfFetch(resource, options)

		// Check if response is an authentication fault
		if (!(await authenticator.isAuthenticated?.(resp))) {
			const maxTries = authenticator.maxTries ?? 3
			let authCount = 0
			let authSuccessful = false

			// Authentication generator to generate an authentication call
			// while we are under the max try threshold
			const tryAuthentication = async function* () {
				while (authCount < maxTries) {
					authCount++
					yield await authenticator.authenticate(resp as Response)
				}

				return false
			}

			// Attempt to authenticate until' generator has reached the max try threshold
			for await (const didAuthenticate of tryAuthentication()) {
				if (didAuthenticate) {
					authSuccessful = true
					break
				}
			}

			// If we reached the max try threshold and authentication was still unsuccessful
			// throw an exception
			if (!authSuccessful) {
				throw new Error('Authentication Failed')
			}

			// Replay request
			resp = await finCsrfFetch(resource, options)
		}
	} else {
		// If request doesn't contain an authenticator, continue has normal
		resp = await finCsrfFetch(resource, options)
	}

	return resp
}

/**
 * Request Init with Authenticator
 */
export interface RequestInitAuth extends RequestInit {
	authenticator?: RequestAuthenticator
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
	preauthenticate?: (request: RequestInfo) => Promise<Request>

	/**
	 * Authenticate
	 *
	 * This function is used to request authentication. This is where the authentication mechanism is handled.
	 *
	 * @param Response to authenticate
	 * @returns true if authentication was successful
	 */
	authenticate: (response: Response) => Promise<boolean>

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
