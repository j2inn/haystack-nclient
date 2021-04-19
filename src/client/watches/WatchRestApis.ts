/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HGrid, HDict, HStr, HList, HDateTime, HNum, HRef } from 'haystack-core'
import { fetchVal } from '../fetchVal'
import { ClientServiceConfig } from '../ClientServiceConfig'
import {
	WatchApis,
	autoGenerateWatchName,
	DEFAULT_LEASE_TIME,
} from './WatchApis'
import { encodeQuery } from '../../util/http'
import { Record } from '../../util/Record'

/**
 * The properties for a watch.
 */
interface WatchProps extends HDict {
	id: HRef
	name: HStr
	lease: HNum
	expiry: HDateTime
}

/**
 * Watch network calls using the RESTful Watch APIs.
 */
export class WatchRestApis implements WatchApis {
	/**
	 * Service configuration.
	 */
	readonly #serviceConfig: ClientServiceConfig

	/**
	 * Constructs a new watch operations object.
	 *
	 * @param serviceConfig service configuration.
	 */
	public constructor(serviceConfig: ClientServiceConfig) {
		this.#serviceConfig = serviceConfig
	}

	/**
	 * Open a new watch.
	 *
	 * @param ids The ids to watch.
	 * @returns The watch open response.
	 * @throws An error if the watch can't be created.
	 */
	public async open(
		ids: string[],
		display?: string
	): Promise<{ id: string; records: Record[] }> {
		const dict = HDict.make({
			name: HStr.make(display || autoGenerateWatchName()),
			ids: HList.make(ids),
			lease: DEFAULT_LEASE_TIME,
		})

		const watchProps = await fetchVal<
			WatchProps & { records: HList<HDict> }
		>(
			this.#serviceConfig.getHaystackServiceUrl('watches?records=true'),
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'POST',
				body: JSON.stringify(dict.toJSON()),
			},
			this.#serviceConfig.fetch
		)

		return {
			id: watchProps.id.value,
			records: watchProps.records.values,
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
	public async add(watchId: string, ids: string[]): Promise<Record[]> {
		const dict = HDict.make({
			add: ids,
		})

		const resp = await fetchVal<HGrid<Record>>(
			`${this.#serviceConfig.getHaystackServiceUrl(
				'watches'
			)}/${watchId}/ids`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'PATCH',
				body: JSON.stringify(dict.toJSON()),
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
	public async poll(watchId: string): Promise<Record[]> {
		const resp = await fetchVal<HGrid<Record>>(
			`${this.#serviceConfig.getHaystackServiceUrl(
				`watches/${watchId}/poll${encodeQuery({ v: Date.now() })}`
			)}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
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
	public async refresh(watchId: string): Promise<Record[]> {
		const resp = await fetchVal<HGrid<Record>>(
			`${this.#serviceConfig.getHaystackServiceUrl(
				`watches/${watchId}/poll`
			)}${encodeQuery({ all: true, v: Date.now() })}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
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
	public async remove(watchId: string, ids: string[]): Promise<void> {
		const dict = HDict.make({
			remove: ids,
		})

		await fetchVal(
			`${this.#serviceConfig.getHaystackServiceUrl(
				'watches'
			)}/${watchId}/ids`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'PATCH',
				body: JSON.stringify(dict.toJSON()),
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
	public async close(watchId: string): Promise<void> {
		await fetchVal(
			`${this.#serviceConfig.getHaystackServiceUrl(
				'watches'
			)}/${watchId}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'DELETE',
			},
			this.#serviceConfig.fetch
		)
	}
}
