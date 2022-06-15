export class AuthenticationError extends Error {
	#cause: Error | undefined
	constructor(cause?: Error, message?: string) {
		super(message ?? cause?.message)
		this.#cause = cause
	}

	public get cause(): Error | undefined {
		return this.#cause
	}
}
