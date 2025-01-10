/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HaysonDict, HDict, HGrid, HList } from 'haystack-core'
import { dictsToGrid, Ids } from '../../util/hval'
import { ClientServiceConfig } from '../ClientServiceConfig'
import { DEFAULT_POLL_RATE_SECS, Watch } from './Watch'
import { ApiSubject } from './ApiSubject'
import { BatchSubject } from './BatchSubject'
import { Subject } from './Subject'
import { WatchApis } from './WatchApis'

/**
 * A service for using watches.
 */
export class WatchService {
	/**
	 * Internal subject used for watches.
	 */
	readonly #subject: Subject

	/**
	 * Constructs a service object.
	 *
	 * @param serviceConfig Service configuration.
	 * @param watchApis Watch network APIs implementation.
	 */
	constructor(serviceConfig: ClientServiceConfig, watchApis: WatchApis) {
		const apiSubject = new ApiSubject(
			watchApis,
			serviceConfig,
			DEFAULT_POLL_RATE_SECS
		)

		this.#subject = new BatchSubject(apiSubject)
	}

	/**
	 * Create a new watch on the specified data.
	 *
	 * https://project-haystack.org/doc/Ops#watchSub
	 * https://project-haystack.org/doc/Ops#watchUnsub
	 * https://project-haystack.org/doc/Ops#watchPoll
	 *
	 * @param display Display name for the watch.
	 * @param ids The ids to watch.
	 * @param grid An optional empty grid to use for the watch.
	 * @returns An opened watch.
	 */
	async make(display: string, ids: Ids, grid?: HGrid): Promise<Watch> {
		return Watch.open({
			subject: this.#subject,
			ids,
			display,
			grid,
		})
	}

	/**
	 * Closes any open watches for this watch service.
	 */
	async close(): Promise<void> {
		await Watch.close(this.#subject)
	}

	/**
	 * Triggers a manual update of the watches.
	 *
	 * This is used to manually update dicts outside of a poll.
	 * Providing the dicts are newer and they're being watched, any
	 * listeners will receive the update as if they were updated from
	 * the server via a watch poll request.
	 *
	 * @param dicts The dicts to update.
	 */
	async update(
		dicts:
			| HDict
			| HaysonDict
			| HDict[]
			| HaysonDict[]
			| HGrid
			| HList<HDict>
	): Promise<void> {
		return this.#subject.update(dictsToGrid(dicts))
	}

	/**
	 * Request a poll for all opened watches.
	 *
	 * Please note, polls are normally handled automatically so manually
	 * calling this is not normally required.
	 */
	async poll(): Promise<void> {
		return this.#subject.poll()
	}
}
