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
	Closed = 'closed',
	Changed = 'changed',
	Refreshed = 'refreshed',
	Added = 'added',
	Removed = 'removed',
}

/**
 * A watch changed event
 */
export interface WatchChangedEvent extends WatchEvent {
	ids: {
		[prop: string]: WatchChanged
	}
}

/**
 * A watch event with an array of ids associated with it.
 */
export interface WatchIdsEvent extends WatchEvent {
	ids: string[]
}
