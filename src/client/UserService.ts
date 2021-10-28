/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { ClientServiceConfig } from './ClientServiceConfig'
import { Record } from '../util/Record'
import { HDict, HMarker, HRef, HStr } from 'haystack-core'
import { HGrid, HaysonDict, HList } from 'haystack-core'
import { fetchVal } from './fetchVal'
import { dictsToGrid } from '../util/hval'
import { encodeQuery } from '../util/http'

/**
 * A user record.
 */
export interface User extends Record {
	// name?: HStr
	// dis?: HStr
	user?: HMarker
	// role?: HStr
}

export interface UserReadOptions {
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
 * An implementation of the FIN user service.
 */
export class UserService<T extends User = User> {
	/**
	 * The client service configuration.
	 */
	readonly #serviceConfig: ClientServiceConfig

	/**
	 * The url for the service.
	 */
	readonly #url: string

	/**
	 * Constructs a new user service object.
	 *
	 * @param serviceConfig Service configuration.
	 */
	public constructor(serviceConfig: ClientServiceConfig) {
		this.#serviceConfig = serviceConfig
		this.#url = serviceConfig.getHostServiceUrl('users')
	}

	/**
	 * Read a user via its id.
	 *
	 * @param id The id of the user to read.
	 * @returns The user record.
	 * @throws An error if the user can't be found.
	 */
	public async readById(id: string | HRef): Promise<T> {
		const user = await fetchVal<T>(
			`${this.#url}/${HRef.make(id).value}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		return user
	}

	/**
	 * Query some users via a haystack filter.
	 *
	 * @param filter The haystack filter to query by.
	 * @param options Optional options for read operation.
	 * @returns The result of the read operation.
	 */
	public async readByFilter(
		filter: string,
		options?: UserReadOptions
	): Promise<HGrid<T>> {
		return fetchVal<HGrid<T>>(
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
	 * Query all users.
	 *
	 * @param options Optional options for read operation.
	 * @returns The result of the read operation.
	 */
	public async readAll(options?: UserReadOptions): Promise<HGrid<T>> {
		return fetchVal<HGrid<T>>(
			`${this.#url}${encodeQuery({
				...(options ?? {}),
			})}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Create multiple user records.
	 *
	 * @param users The users to create.
	 * @returns A grid of users.
	 */
	public async create(
		users: T[] | HaysonDict[] | HGrid<T> | HList<T>
	): Promise<HGrid<T>> {
		return fetchVal<HGrid<T>>(
			this.#url,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'POST',
				body: JSON.stringify(dictsToGrid(users).toJSON()),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Create a single user record.
	 *
	 * @param user The user record to create.
	 * @returns The created user record.
	 */
	public async createUser(user: T | HaysonDict): Promise<T> {
		return fetchVal<T>(
			this.#url,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'POST',
				body: JSON.stringify(HDict.make(user).toJSON()),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Update a user record.
	 *
	 * @param user The user record to update.
	 * @returns A updated record. Please note, this record doesn't
	 * have any user information just the `id` and `mod`.
	 */
	public async update(user: T | HaysonDict): Promise<Record> {
		const userDict = HDict.make(user) as Record

		return fetchVal<Record>(
			`${this.#url}/${userDict.id?.value ?? ''}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'PATCH',
				body: JSON.stringify(userDict.toJSON()),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Delete a user record via its id.
	 *
	 * @param id The id of the record to delete.
	 */
	public async deleteById(id: string | HRef): Promise<void> {
		await fetchVal<Record>(
			`${this.#url}/${HRef.make(id).value}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'DELETE',
			},
			this.#serviceConfig.fetch
		)
	}
}
