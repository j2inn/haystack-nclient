/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HDateTime, HDict, HRef } from 'haystack-core'

/**
 * A record dict.
 */
export interface Record extends HDict {
	/**
	 * The id of the record.
	 */
	id?: HRef

	/**
	 * The last time the record was modified.
	 */
	mod?: HDateTime
}
