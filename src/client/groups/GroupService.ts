/*
 * Copyright (c) 2021, J2 Innovations. All Rights Reserved
 */

import { HDict, HGrid, HMarker, HRef, HaysonDict, HList } from 'haystack-core'
import { ClientServiceConfig } from '../ClientServiceConfig'
import { fetchVal } from '../fetchVal'
import { dictsToGrid } from '../../util/hval'
import { encodeQuery } from '../../util/http'
import { ReadOptions } from '../RecordService'

/**
 * A group record
 */
export interface Group extends HDict {
	id?: HRef
	userGroup: HMarker
}

/**
 * Optional parameters available to readByFilter query
 */
export type GroupsReadOptions = Omit<ReadOptions, 'unique'>

/**
 * An implementation of the FIN Groups service.
 */
export class GroupsService<GroupType extends Group = Group> {
	/**
	 * The client service configuration.
	 */
	readonly #serviceConfig: ClientServiceConfig

	/**
	 * The url for the service.
	 */
	readonly #url: string

	/**
	 * Constructs a new groups service object.
	 *
	 * @param serviceConfig Service configuration.
	 */
	public constructor(serviceConfig: ClientServiceConfig) {
		this.#serviceConfig = serviceConfig
		this.#url = serviceConfig.getHostServiceUrl('groups')
	}

	/**
	 * Query all groups.
	 *
	 * @param options Optional options for read operation.
	 * @returns The result of the read operation.
	 */
	public async readAll(options?: GroupsReadOptions): Promise<GroupType[]> {
		const groups = await fetchVal<HGrid<GroupType>>(
			`${this.#url}${encodeQuery({
				...(options ?? {}),
			})}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		if (groups.isEmpty()) {
			return []
		}

		return groups.getRows()
	}

	/**
	 * Read a group via its id.
	 *
	 * @param id The id of the group to read.
	 * @returns The group record.
	 * @throws An error if the group can't be found.
	 */
	public async readById(id: string | HRef): Promise<GroupType> {
		const group = await fetchVal<GroupType>(
			`${this.#url}/${HRef.make(id).value}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		return group
	}

	/**
	 * Query some groups via a haystack filter.
	 *
	 * @param filter The haystack filter to query by.
	 * @param options Optional options for read operation.
	 * @returns The result of the read operation.
	 */
	public async readByFilter(
		filter: string,
		options?: GroupsReadOptions
	): Promise<HGrid<GroupType>> {
		return fetchVal<HGrid<GroupType>>(
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
	 * Create multiple group records.
	 *
	 * @param groups The groups to create.
	 * @returns A grid of groups.
	 */
	public async create(
		groups: GroupType[] | HaysonDict[] | HGrid<GroupType> | HList<GroupType>
	): Promise<HGrid<GroupType>> {
		return fetchVal<HGrid<GroupType>>(
			`${this.#url}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'POST',
				body: JSON.stringify(dictsToGrid(groups).toJSON()),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Create a single group record.
	 *
	 * @param group The group record to create.
	 * @returns The created group record.
	 */
	public async createGroup(
		group: GroupType | HaysonDict
	): Promise<GroupType> {
		return fetchVal<GroupType>(
			this.#url,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'POST',
				body: JSON.stringify(HDict.make(group).toJSON()),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Update a group record.
	 *
	 * @param group The group record to update.
	 * @returns A updated record. Please note, this record doesn't
	 * have any group information just the `id` and `mod`.
	 */
	public async update(group: GroupType | HaysonDict): Promise<GroupType> {
		const groupDict = HDict.make(group) as GroupType

		return fetchVal<GroupType>(
			`${this.#url}/${groupDict.id?.value ?? ''}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'PATCH',
				body: JSON.stringify(groupDict.toJSON()),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Delete a group record via its id.
	 *
	 * @param id The id of the record to delete.
	 */
	public async deleteById(id: string | HRef): Promise<void> {
		await fetchVal<HRef>(
			`${this.#url}/${HRef.make(id).value}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'DELETE',
			},
			this.#serviceConfig.fetch
		)
	}
}
