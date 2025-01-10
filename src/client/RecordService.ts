/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HGrid, HRef, HDict, HaysonDict, HList, HNum } from 'haystack-core'
import { fetchVal } from './fetchVal'
import { dictsToGrid } from '../util/hval'
import { ClientServiceConfig } from './ClientServiceConfig'
import { encodeQuery } from '../util/http'
import { Record } from '../util/Record'

/**
 * Options for reading records.
 */
export interface ReadOptions {
	/**
	 * If defined, specifies which columns should have distinct values.
	 */
	unique?: string[]

	/**
	 * If defined, specifies the name of the tag/prop by which the returned records are sorted in ascending order.
	 */
	sort?: string[]

	/**
	 * If defined, specifies the max number of record that will be returned by the read
	 */
	limit?: number

	/**
	 * If defined, limit the number of columns sent back in the response.
	 */
	columns?: string[]
}

/**
 * An implementation of the FIN record service.
 *
 * Please note, this is currently not part of the official Haystack standard.
 */
export class RecordService {
	/**
	 * The client service configuration.
	 */
	readonly #serviceConfig: ClientServiceConfig

	/**
	 * The url for the record service.
	 */
	readonly #url: string

	/**
	 * Constructs a new record service object.
	 *
	 * @param serviceConfig Service configuration.
	 */
	constructor(serviceConfig: ClientServiceConfig) {
		this.#serviceConfig = serviceConfig
		this.#url = serviceConfig.getHaystackServiceUrl('records')
	}

	/**
	 * Read a record via its id.
	 *
	 * @param id The id of the record to read.
	 * @returns The record.
	 * @throws An error if the record can't be found.
	 */
	async readById(id: string | HRef): Promise<Record> {
		const record = await fetchVal<Record>(
			`${this.#url}/${HRef.make(id).value}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		return record as Record
	}

	/**
	 * Read multiple records via their ids.
	 *
	 * @param id The ids of the records to read.
	 * @param options Optional options for read operation.
	 * @returns The result of the read operation.
	 */
	async readByIds(
		ids: string[] | HRef[] | HList<HRef>,
		options?: ReadOptions
	): Promise<HGrid<Record>> {
		return fetchVal<HGrid<Record>>(
			`${this.#url}${encodeQuery({
				ids,
				...(options ?? {}),
			})}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Query some records via a haystack filter.
	 *
	 * @param filter The haystack filter to query by.
	 * @param options Optional options for read operation.
	 * @returns The result of the read operation.
	 */
	async readByFilter(
		filter: string,
		options?: ReadOptions
	): Promise<HGrid<Record>> {
		return fetchVal<HGrid<Record>>(
			`${this.#url}${encodeQuery({
				filter,
				...(options ?? {}),
			})}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Query some records via a haystack filter and return the record count.
	 *
	 * @param filter The haystack filter to query by.
	 * @returns The number of records counted.
	 */
	async readCount(filter: string): Promise<number> {
		const grid = await fetchVal<HGrid>(
			`${this.#url}${encodeQuery({
				count: filter,
			})}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		return grid.meta.get<HNum>('count')?.value ?? 0
	}

	/**
	 * Create some records on the server.
	 *
	 * @param dicts An array of dicts, array of hayson dicts, list of dicts
	 * or a grid.
	 * @returns The resultant grid of the create operation. The grid contains a
	 * 'created' number property for the number of records created in the meta.
	 */
	async create(
		dicts: HDict[] | HaysonDict[] | HGrid | HList<HDict>
	): Promise<HGrid<Record>> {
		return fetchVal<HGrid<Record>>(
			this.#url,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'POST',
				body: JSON.stringify(dictsToGrid(dicts).toJSON()),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Create a single record on the server.
	 *
	 * @param dict The record to create.
	 * @returns The resultant dict of the create operation.
	 */
	async createRecord(dict: HDict | HaysonDict): Promise<Record> {
		return fetchVal<Record>(
			this.#url,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'POST',
				body: JSON.stringify(HDict.make(dict).toJSON()),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Delete a record via its id.
	 *
	 * @param id The id of the record to delete.
	 * @returns If the record
	 */
	async deleteById(id: string | HRef): Promise<Record> {
		const record = await fetchVal<Record>(
			`${this.#url}/${HRef.make(id).value}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'DELETE',
			},
			this.#serviceConfig.fetch
		)

		return record as Record
	}

	/**
	 * Delete multiple records via their ids.
	 *
	 * @param id The ids of the records to delete.
	 * @returns A grid with the records that were deleted. Each record only
	 * contains the `id` and `mod` properties. The grid meta contains an
	 * `deleted` number property for the total number of records deleted.
	 */
	async deleteByIds(
		ids: string[] | HRef[] | HList<HRef>
	): Promise<HGrid<Record>> {
		return fetchVal<HGrid<Record>>(
			`${this.#url}${encodeQuery({
				ids,
			})}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'DELETE',
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Delete some records via a haystack filter.
	 *
	 * This method should be used with extreme caution! This command
	 * could unintentionally delete critical records in a database.
	 *
	 * @param filter The haystack filter to query by.
	 * @returns A grid with the records that were deleted. Each record only
	 * contains the `id` and `mod` properties. The grid meta contains an
	 * `deleted` number property for the total number of records deleted.
	 */
	async deleteByFilter(filter: string): Promise<HGrid<Record>> {
		return fetchVal<HGrid<Record>>(
			`${this.#url}${encodeQuery({
				filter,
			})}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'DELETE',
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Update by a filter.
	 *
	 * This method should be used with extreme caution! This command
	 * could unintentionally update critical records in a database.
	 *
	 * @param dict The dict to be applied to all records found.
	 * @param options Optional options for the update operation.
	 * @returns A grid with the records that were updated. Each record only
	 * contains the `id` and `mod` properties. The grid meta contains an
	 * `updated` number property for the total number of records updated.
	 */
	async updateByFilter(
		filter: string,
		dict: HDict | HaysonDict
	): Promise<HGrid<Record>> {
		return fetchVal<HGrid<Record>>(
			`${this.#url}${encodeQuery({
				filter,
			})}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'PATCH',
				body: JSON.stringify(HDict.make(dict).toJSON()),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Update some records via their ids.
	 *
	 * @param dicts The dicts to update. Each record must specify an id.
	 * @returns A grid with the records that were updated. Each record only
	 * contains the `id` and `mod` properties. The grid meta contains an
	 * `updated` number property for the total number of records updated.
	 */
	async update(
		dicts:
			| HDict
			| HaysonDict
			| HDict[]
			| HaysonDict[]
			| HGrid
			| HList<HDict>
	): Promise<HGrid<Record>> {
		return fetchVal<HGrid<Record>>(
			this.#url,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'PATCH',
				body: JSON.stringify(dictsToGrid(dicts).toJSON()),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Duplicate an existing record in the database.
	 *
	 * @param options The duplicate options.
	 * @param options.id The id of the record to duplicate.
	 * @param options.count The number of times to duplicate a record.
	 * @param options.includeChildren Whether to also duplicate any contained child records.
	 * @returns A list of top level record ids that were duplicated. This does not include
	 * any child record ids that were duplicated.
	 */
	async duplicate({
		id,
		count,
		includeChildren,
	}: {
		id: string | HRef
		count: number
		includeChildren: boolean
	}): Promise<HList<HRef>> {
		return fetchVal<HList<HRef>>(
			`${this.#url}/${HRef.make(id).value}/duplicate`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'POST',
				body: JSON.stringify(
					new HDict({
						count,
						includeChildren,
					})
				),
			},
			this.#serviceConfig.fetch
		)
	}
}
