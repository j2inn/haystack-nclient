/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HNum } from 'haystack-core'
import { Record } from '../../util/Record'

/**
 * Automatically create a watch name.
 */
export function autoGenerateWatchName(): string {
	return `haystack-nclient@${new Date().toISOString()}`
}

/**
 * The default lease time used with a watch.
 */
export const DEFAULT_LEASE_TIME = HNum.make(1, 'min')

/**
 * Watch network APIs.
 */
export interface WatchApis {
	/**
	 * Open a new watch.
	 *
	 * @param ids The ids to watch.
	 * @returns The watch server id and records.
	 * @throws An error if the watch can't be created.
	 */
	open(
		ids: string[],
		display?: string
	): Promise<{ id: string; records: Record[] }>

	/**
	 * Add some records to an existing watch.
	 *
	 * All the current records being watched must be returned.
	 *
	 * @param watchId The id of the watch.
	 * @param ids The record ids to watch.
	 * @returns The current state of the new records being watched.
	 * @throws An error if the watch can't be found.
	 */
	add(watchId: string, ids: string[]): Promise<Record[]>

	/**
	 * Poll an existing watch.
	 *
	 * Only records that have changed are returned.
	 *
	 * @param watchId The watch id to poll.
	 * @returns The records that have changed.
	 * @throws An error if the watch can't be found.
	 */
	poll(watchId: string): Promise<Record[]>

	/**
	 * Refresh an existing watch.
	 *
	 * This refreshes all the values in the watch and returns their records.
	 *
	 * @param watchId The watch id to poll.
	 * @returns All the records for the watch.
	 * @throws An error if the watch can't be found.
	 */
	refresh(watchId: string): Promise<Record[]>

	/**
	 * Remove records from an existing watch.
	 *
	 * @param watchId The id of the watch.
	 * @param ids The record ids to remove.
	 * @throws An error if the watch can't be found.
	 */
	remove(watchId: string, ids: string[]): Promise<void>

	/**
	 * Close an existing watch.
	 *
	 * @param watchId The id of the watch.
	 * @throws An error if the watch can't be found.
	 */
	close(watchId: string): Promise<void>
}
