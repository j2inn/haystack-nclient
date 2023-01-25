/*
 * Copyright (c) 2023, J2 Innovations. All Rights Reserved
 */

import { HaysonDict, HDict, HGrid, HMarker, HRef, HStr } from 'haystack-core'
import { ClientServiceConfig } from '../ClientServiceConfig'
import { fetchVal } from '../fetchVal'
import { dictsToGrid } from '../../util/hval'
import { encodeQuery } from '../../util/http'

/**
 * Options for reading functions.
 */
interface ReadOptions {
	/**
	 * If defined, Gets the functions filtered by a Haystack filter
	 */
	filter?: string

	/**
	 * If defined, specifies the name of the tag/prop by which the returned function records are sorted in ascending order.
	 */
	sort?: string[]

	/**
	 * If defined, specifies the max number of function records that will be returned by the read
	 */
	limit?: number

	/**
	 * If defined, limit the number of columns sent back in the response.
	 */
	columns?: string[]
}

/**
 * A function record
 */
export interface FinFunction extends HDict {
	finFunc: HMarker
	name: HStr
	src: HStr
	id?: HRef
	lang?: HStr
	appSpace?: string
	allowedApps?: string[]
	allowedRoles?: string[]
}

/**
 * An implementation of the FIN Function service.
 */
export class FunctionService<FunctionType extends FinFunction = FinFunction> {
	/**
	 * The client service configuration.
	 */
	readonly #serviceConfig: ClientServiceConfig

	/**
	 * The url for the service.
	 */
	readonly #url: string

	/**
	 * Constructs a new function service object.
	 *
	 * @param serviceConfig Service configuration.
	 */
	public constructor(serviceConfig: ClientServiceConfig) {
		this.#serviceConfig = serviceConfig
		this.#url = serviceConfig.getHaystackServiceUrl('funcs')
	}

	/**
	 * Query all functions.
	 *
	 * @param options Optional options for read operation.
	 * @returns The result of the read operation.
	 */
	public async readAll(options?: ReadOptions): Promise<FunctionType[]> {
		const functions = await fetchVal<HGrid<FunctionType>>(
			`${this.#url}${encodeQuery({
				...(options ?? {}),
			})}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		return !functions.isEmpty() ? functions.getRows() : []
	}

	/**
	 * Read a function record via its id.
	 *
	 * @param id The id of the function to read.
	 * @returns The function record.
	 * @throws An error if the function can't be found.
	 */
	public async readById(id: string | HRef): Promise<FunctionType> {
		return await fetchVal<FunctionType>(
			`${this.#url}/${HRef.make(id).value}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Create function record(s).
	 *
	 * @param functions HGrid<FunctionType> The functions to create.
	 * @returns A grid of functions.
	 */
	public async create(
		functions: FunctionType[] | HaysonDict[] | HGrid<FunctionType>
	): Promise<HGrid<FunctionType>> {
		return fetchVal<HGrid<FunctionType>>(
			`${this.#url}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'POST',
				body: JSON.stringify(dictsToGrid(functions).toJSON()),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Update a function record.
	 *
	 * @param function The function record to update.
	 * @returns The updated record.
	 */
	public async update(
		finFunction: FunctionType | HaysonDict
	): Promise<FunctionType> {
		const functionDict = HDict.make(finFunction) as FunctionType

		return fetchVal<FunctionType>(
			`${this.#url}/${functionDict.id?.value ?? ''}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'PATCH',
				body: JSON.stringify(functionDict.toJSON()),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Delete a function record via its id.
	 *
	 * @param id The id of the record to delete.
	 */
	public async deleteById(id: string | HRef): Promise<void> {
		await fetchVal<FunctionType>(
			`${this.#url}/${HRef.make(id).value}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'DELETE',
			},
			this.#serviceConfig.fetch
		)
	}
}
