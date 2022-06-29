/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HNamespace } from 'haystack-core'
import { FetchMethod } from './fetchVal'

/**
 * Client service configuration.
 */
export interface ClientServiceConfig {
	/**
	 * Return the URL for a general REST service/
	 *
	 * @param path The API path.
	 * @return The services URL.
	 */
	getOriginApiUrl(path: string): string

	/**
	 * Return the URL for the op.
	 *
	 * @param op The op name.
	 * @return The Op's URL.
	 */
	getOpUrl(op: string): string

	/**
	 * Return the URL for a Haystack REST service.
	 *
	 * @param path The service path.
	 * @return The service's URL.
	 */
	getHaystackServiceUrl(path: string): string

	/**
	 * Return the URL for a Host REST service.
	 *
	 * @param path The service path.
	 * @return The service's URL.
	 */
	getHostServiceUrl(path: string): string

	/**
	 * @returns The default options to used with a fetch operation.
	 */
	getDefaultOptions(): RequestInit

	/**
	 * A network fetch function to use for network calls.
	 */
	fetch?: FetchMethod

	/**
	 * The namespace defs.
	 */
	defs: HNamespace
}
