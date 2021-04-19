/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HRef, HDict } from 'haystack-core'
import { WatchChangedEvent } from './WatchEvent'

/**
 * The subject changed event callback handler.
 */
export interface SubjectChangedEventHandler {
	(event: WatchChangedEvent): void
}

/**
 * A subject is observed by a watch.
 */
export interface Subject {
	/**
	 * The display name of the subject.
	 */
	readonly display: string

	/**
	 * The subject's poll rate.
	 */
	pollRate: number

	/**
	 * Refresh the subject's data.
	 */
	refresh(): Promise<void>

	/**
	 * Add records to observe.
	 *
	 * @param ids The ids to add.
	 */
	add(ids: string[]): Promise<void>

	/**
	 * Remove records from the subject.
	 *
	 * This is called to stop observing records.
	 *
	 * @param ids The ids to remove.
	 */
	remove(ids: string[]): Promise<void>

	/**
	 * Register a callback for changed events.
	 *
	 * @param callback The callback used for changed events.
	 */
	on(callback: SubjectChangedEventHandler): void

	/**
	 * Unregister the callback for changed events.
	 *
	 * @param callback The callback used for changed events.
	 */
	off(callback: SubjectChangedEventHandler): void

	/**
	 * Return a record via its id or undefined if it can't be found.
	 *
	 * @param id The id to record to get.
	 * @returns The dict or undefined if it can't be found.
	 */
	get(id: string | HRef): HDict | undefined

	/**
	 * Inspect the subject.
	 */
	inspect(): void
}
