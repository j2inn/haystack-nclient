/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HVal } from 'haystack-core'

/**
 * A watch event.
 */
export interface WatchEvent {
	type: WatchEventType
}

/**
 * A changes data structure.
 */
export interface WatchChanged {
	added?: { name: string; value: HVal }[]
	removed?: { name: string; value: HVal }[]
	changed?: { name: string; oldValue: HVal; value: HVal }[]
}

/**
 * Watch events to listen too.
 */
export enum WatchEventType {
	/**
	 * A watch has been closed and is no longer active.
	 */
	Closed = 'closed',

	/**
	 * A watch's records have changed.
	 */
	Changed = 'changed',

	/**
	 * A watch has been refreshed.
	 */
	Refreshed = 'refreshed',

	/**
	 * A watch has records added to it.
	 */
	Added = 'added',

	/**
	 * A watch has records removed from it.
	 */
	Removed = 'removed',

	/**
	 * A watch is attempting to watch records
	 * that don't exist.
	 */
	Error = 'error',
}

/**
 * A watch changed event.
 *
 * This is associated with a `changed` event.
 */
export interface WatchChangedEvent extends WatchEvent {
	ids: {
		[prop: string]: WatchChanged
	}
}

/**
 * A watch event with an array of ids associated with it.
 *
 * This is associated with `added`, `removed` and `error` events.
 */
export interface WatchIdsEvent extends WatchEvent {
	ids: string[]
}
