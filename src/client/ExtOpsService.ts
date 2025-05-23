/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import {
	HGrid,
	HDict,
	HaysonDict,
	HList,
	HNamespace,
	HStr,
} from 'haystack-core'
import { fetchAllGrids } from './fetchAllGrids'
import { fetchVal } from './fetchVal'
import { dictsToGrid } from '../util/hval'
import { ClientServiceConfig } from './ClientServiceConfig'
import { BatchProcessor } from '../util/BatchProcessor'
import { GridError } from './GridError'

/**
 * The commit op type.
 */
export enum CommitType {
	Add = 'add',
	Update = 'update',
	Remove = 'remove',
}

/**
 * Extended non-standard Haystack ops.
 */
export class ExtOpsService {
	/**
	 * A service configuration object.
	 */
	readonly #serviceConfig: ClientServiceConfig

	/**
	 * Internal cached load defs promise.
	 */
	#loadDefsPromise?: Promise<HNamespace>

	/**
	 * Batch processor for evals.
	 */
	readonly #evalBatchProcessor: BatchProcessor<string, HGrid>

	/**
	 * Constructs a service object.
	 *
	 * @param serviceConfig Service configuration.
	 */
	constructor(serviceConfig: ClientServiceConfig) {
		this.#serviceConfig = serviceConfig
		this.#evalBatchProcessor = new BatchProcessor({
			batcher: this.batchEval,
		})
	}

	/**
	 * Asynchronously load the defs library using this service.
	 *
	 * Please note, this will overwrite any existing defs loaded.
	 *
	 * @returns A promise that's resolved once the defs have been loaded.
	 */
	async loadDefs(): Promise<void> {
		if (!this.isDefsLoaded()) {
			try {
				const defs = await (this.#loadDefsPromise ??
					(this.#loadDefsPromise = this.requestDefs()))

				this.#serviceConfig.defs = defs
			} catch (err) {
				// If there's an error then don't cache the promise so it can be retried.
				this.#loadDefsPromise = undefined
				throw err
			}
		}
	}

	/**
	 * @returns True if the defs have been loaded using this service.
	 */
	isDefsLoaded(): boolean {
		return !this.#serviceConfig.defs.grid.isEmpty()
	}

	/**
	 * @returns A promise that resolves to the service's defs.
	 */
	private async requestDefs(): Promise<HNamespace> {
		return new HNamespace(await this.eval('defs()'))
	}

	/**
	 * Commit changes to the database. The caller must have 'admin' permissions
	 * in order to use this op.
	 *
	 * The commit type can be one of the following...
	 *
	 * - add: adds new records into the database and returns a grid with the newly minted
	 * record identifiers. As a general rule you should not have an id column in your commit grid.
	 * However if you wish to predefine the id of the records, you can specify an id column in the commit grid.
	 * - update: modified existing records, the records must have both an id and mod column
	 * - remove: removes existing records, the records should have only an id and mod column
	 *
	 * https://skyfoundry.com/doc/docSkySpark/Ops#commit
	 *
	 * @param type The commit operation type (add, update or remove).
	 * @param data The data to commit.
	 */
	async commit(
		type: CommitType,
		data: HDict | HaysonDict | HDict[] | HaysonDict[] | HGrid | HList<HDict>
	): Promise<HGrid> {
		const grid = dictsToGrid(data)
		grid.meta.set('commit', type)

		return fetchVal<HGrid>(
			this.#serviceConfig.getOpUrl('commit'),
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'POST',
				body: grid.toZinc(),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Evalulate a haystack filter request and return the result.
	 *
	 * This operation will automatically attempt to batch network calls
	 * together to optimize client network requests.
	 *
	 * @param filter The haystack filter.
	 * @returns The result of the filter query.
	 */
	async read(filter: string): Promise<HGrid> {
		return this.eval(`parseFilter(${HStr.make(filter).toAxon()}).readAll()`)
	}

	/**
	 * Used when evaluating batched eval requests.
	 *
	 * @param exprs The expressions to evaluate.
	 * @returns The evalulated expression responses.
	 */
	private batchEval = async (exprs: string[]): Promise<(HGrid | Error)[]> => {
		if (exprs.length === 1) {
			return [await this.doEval(exprs[0])]
		} else {
			// Any grid errors need to be turned into error objects so they can be picked up
			// by the batch processor.
			return (await this.doEvalAll(exprs)).map((grid) => {
				const error = grid.getError()
				return error ? new GridError(error.dis, grid) : grid
			})
		}
	}

	/**
	 * Evaluate some code server side and return the response.
	 *
	 * This operation will automatically attempt to batch network calls
	 * together to optimize client network requests.
	 *
	 * https://skyfoundry.com/doc/docSkySpark/Ops#eval
	 *
	 * @param expr The expression to evaluate.
	 * @returns The evaluated expression response.
	 */
	async eval(expr: string): Promise<HGrid> {
		return this.#evalBatchProcessor.invoke(expr)
	}

	/**
	 * Evaluate some code server side and return the response.
	 *
	 * https://skyfoundry.com/doc/docSkySpark/Ops#eval
	 *
	 * @param expr The expression to evaluate.
	 * @returns The evaluated expression response.
	 */
	private async doEval(expr: string): Promise<HGrid> {
		return fetchVal<HGrid>(
			this.#serviceConfig.getOpUrl('eval'),
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'POST',
				body: HDict.make({ expr }).toGrid().toZinc(),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Evalulate all the expressions and return the grids.
	 *
	 * https://skyfoundry.com/doc/docSkySpark/Ops#evalAll
	 *
	 * @param exprs The expressions to evaluate.
	 * @returns The evalulated expression responses.
	 * @throws Any fetch or grid responses.
	 */
	async evalAll(exprs: string[]): Promise<HGrid[]> {
		const grids = await this.doEvalAll(exprs)

		// Throw any grid errors found in the response.
		for (const grid of grids) {
			const err = grid.getError()
			if (err) {
				throw new GridError(err.dis, grid)
			}
		}

		return grids
	}

	/**
	 * Evalulate all the expressions and return the grids.
	 *
	 * https://skyfoundry.com/doc/docSkySpark/Ops#evalAll
	 *
	 * @param exprs The expressions to evaluate.
	 * @returns The evalulated expression responses.
	 */
	private async doEvalAll(exprs: string[]): Promise<HGrid[]> {
		const grid = HGrid.make(
			exprs.map((expr: string): HDict => HDict.make({ expr }))
		)

		return fetchAllGrids(
			this.#serviceConfig.getOpUrl('evalAll'),
			exprs.length,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'POST',
				body: grid.toZinc(),
			},
			this.#serviceConfig.fetch
		)
	}
}
