/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

/* eslint @typescript-eslint/no-explicit-any: "off" */

/**
 * The global web entry for Haystack Client.
 *
 * This will load the library under the global 'hs' namespace.
 *
 * @module
 */
import * as hsCore from 'haystack-core'
import { Client } from './client/Client'
import * as hsClient from './index'

if (typeof window !== 'undefined' && window !== null) {
	const wnd = window as any

	// Export core, client and the default client into a namespace.
	wnd.hs = {
		...hsCore,
		...hsClient,
		client: new Client({ base: new URL(window.location.href) }),
	}
}
