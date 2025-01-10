/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HGrid, HDict, HStr, HMarker, HRef } from 'haystack-core'
import { idsToDicts } from '../../util/hval'
import { fetchVal } from '../fetchVal'
import { ClientServiceConfig } from '../ClientServiceConfig'
import {
	WatchApis,
	autoGenerateWatchName,
	DEFAULT_LEASE_TIME,
} from './WatchApis'
import { Record } from '../../util/Record'

/**
 * The watch subscribe operation.
 */
export const WATCH_SUB_OP = 'watchSub'

/**
 * The watch poll operation.
 */
export const WATCH_POLL_OP = 'watchPoll'

/**
 * The watch unsubscribe operation.
 */
export const WATCH_UNSUB_OP = 'watchUnsub'

/**
 * Watch network calls using Haystack ops.
 */
export class WatchOpApis implements WatchApis {
	/**
	 * Service configuration.
	 */
	readonly #serviceConfig: ClientServiceConfig

	/**
	 * Constructs a new watch operations object.
	 *
	 * @param serviceConfig service configuration.
	 */
	constructor(serviceConfig: ClientServiceConfig) {
		this.#serviceConfig = serviceConfig
	}

	/**
	 * Open a new watch.
	 *
	 * @param ids The ids to watch.
	 * @returns The watch open response.
	 * @throws An error if the watch can't be created.
	 */
	async open(
		ids: string[],
		display?: string
	): Promise<{ id: string; records: Record[] }> {
		const grid = HGrid.make({
			meta: HDict.make({
				watchDis: HStr.make(display || autoGenerateWatchName()),
				lease: DEFAULT_LEASE_TIME,
			}),
			rows: idsToDicts(ids),
		})

		const resp = await fetchVal<HGrid<Record>>(
			this.#serviceConfig.getOpUrl(WATCH_SUB_OP),
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'POST',
				body: grid.toZinc(),
			},
			this.#serviceConfig.fetch
		)

		return {
			id: resp.meta.get<HStr | HRef>('watchId')?.value ?? '',
			records: resp.getRows(),
		}
	}

	/**
	 * Add some records to an existing watch.
	 *
	 * @param watchId The id of the watch.
	 * @param ids The record ids to watch.
	 * @returns The watch add response.
	 * @throws An error if the watch can't be found.
	 */
	async add(watchId: string, ids: string[]): Promise<Record[]> {
		const grid = HGrid.make({
			meta: HDict.make({ watchId: HStr.make(watchId) }),
			rows: idsToDicts(ids),
		})

		const resp = await fetchVal<HGrid<Record>>(
			this.#serviceConfig.getOpUrl(WATCH_SUB_OP),
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'POST',
				body: grid.toZinc(),
			},
			this.#serviceConfig.fetch
		)

		return resp.getRows()
	}

	/**
	 * Poll an existing watch.
	 *
	 * @param watchId The watch id to poll.
	 * @returns The watch poll data.
	 * @throws An error if the watch can't be found.
	 */
	async poll(watchId: string): Promise<Record[]> {
		const grid = HGrid.make({
			meta: HDict.make({ watchId }),
		})

		const resp = await fetchVal<HGrid<Record>>(
			this.#serviceConfig.getOpUrl(WATCH_POLL_OP),
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'POST',
				body: grid.toZinc(),
			},
			this.#serviceConfig.fetch
		)

		return resp.getRows()
	}

	/**
	 * Refresh an existing watch.
	 *
	 * @param watchId The watch id to poll.
	 * @returns The watch poll data.
	 * @throws An error if the watch can't be found.
	 */
	async refresh(watchId: string): Promise<Record[]> {
		const grid = HGrid.make({
			meta: HDict.make({
				watchId: HStr.make(watchId),
				refresh: HMarker.make(),
			}),
		})

		const resp = await fetchVal<HGrid<Record>>(
			this.#serviceConfig.getOpUrl(WATCH_POLL_OP),
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'POST',
				body: grid.toZinc(),
			},
			this.#serviceConfig.fetch
		)

		return resp.getRows()
	}

	/**
	 * Remove records from an existing watch.
	 *
	 * @param watchId The id of the watch.
	 * @param ids The record ids to remove.
	 * @throws An error if the watch can't be found.
	 */
	async remove(watchId: string, ids: string[]): Promise<void> {
		const grid = HGrid.make({
			meta: HDict.make({ watchId: HStr.make(watchId) }),
			rows: idsToDicts(ids),
		})

		await fetchVal<HGrid>(
			this.#serviceConfig.getOpUrl(WATCH_UNSUB_OP),
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'POST',
				body: grid.toZinc(),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Close an existing watch.
	 *
	 * @param watchId The id of the watch.
	 * @throws An error if the watch can't be found.
	 */
	async close(watchId: string): Promise<void> {
		const grid = HGrid.make({
			meta: HDict.make({
				watchId: HStr.make(watchId),
				close: HMarker.make(),
			}),
		})

		await fetchVal<HGrid>(
			this.#serviceConfig.getOpUrl(WATCH_UNSUB_OP),
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'POST',
				body: grid.toZinc(),
			},
			this.#serviceConfig.fetch
		)
	}
}
