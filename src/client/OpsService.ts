/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import {
	HGrid,
	HRef,
	HDict,
	HaysonDict,
	HList,
	HaysonVal,
	HVal,
	HStr,
	HNum,
	HDate,
	HDateTime,
	isHVal,
	makeValue,
	Kind,
	valueIsKind,
} from 'haystack-core'
import { fetchVal } from './fetchVal'
import { dictsToGrid } from '../util/hval'
import { ClientServiceConfig } from './ClientServiceConfig'
import { WatchService } from './watches/WatchService'
import { WatchOpApis } from './watches/WatchOpApis'

/**
 * The history range.
 */
export enum HisRange {
	Today = 'today',
	Yesterday = 'yesterday',
}

/**
 * A service used for calling standard Haystack Ops.
 */
export class OpsService {
	/**
	 * A service configuration object.
	 */
	readonly #serviceConfig: ClientServiceConfig

	/**
	 * The watch ops service.
	 */
	public readonly watch: WatchService

	/**
	 * Constructs a new record service object.
	 *
	 * @param serviceConfig Ops configuration.
	 */
	public constructor(serviceConfig: ClientServiceConfig) {
		this.#serviceConfig = serviceConfig

		this.watch = new WatchService(
			this.#serviceConfig,
			new WatchOpApis(this.#serviceConfig)
		)
	}

	/**
	 * https://project-haystack.org/doc/Ops#about
	 *
	 * @returns Server about information.
	 */
	public async about(): Promise<HGrid> {
		return fetchVal<HGrid>(
			this.#serviceConfig.getOpUrl('about'),
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * https://project-haystack.org/doc/Ops#ops
	 *
	 * @returns Available ops that can be invoked.
	 */
	public async ops(): Promise<HGrid> {
		return fetchVal<HGrid>(
			this.#serviceConfig.getOpUrl('ops'),
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * https://project-haystack.org/doc/Ops#formats
	 *
	 * @returns Available formats supported by the server.
	 */
	public async formats(): Promise<HGrid> {
		return fetchVal<HGrid>(
			this.#serviceConfig.getOpUrl('formats'),
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * A generic method used to invoke any op on the server using an HTTP POST.
	 *
	 * @param op The name of the op to invoke.
	 * @param grid An optional grid argument that is encoded with the op call.
	 * @returns The response grid.
	 */
	public async invokeOp(op: string, grid?: HGrid): Promise<HGrid> {
		const options = {
			...this.#serviceConfig.getDefaultOptions(),
			method: 'POST',
		}

		if (grid) {
			options.body = grid.toZinc()
		}

		return fetchVal<HGrid>(
			this.#serviceConfig.getOpUrl(op),
			options,
			this.#serviceConfig.fetch
		)
	}

	/**
	 * @returns Reads a set of records from the server.
	 *
	 * Please note, to help build a Haystack filter you can use HFilterBuilder available in
	 * Haystack Core.
	 *
	 * ```typescript
	 * const filter = new HFilterBuilder()
	 *	.has('site')
	 *	.and()
	 *	.equals('geoCity', 'Las Vegas')
	 *	.build()
	 *
	 * const result = await client.read(filter)
	 * ```
	 *
	 * https://project-haystack.org/doc/Ops#read
	 *
	 * @param filter The required haystack filter.
	 * @param limit Optional limit on the number of records sent back.
	 * @returns A grid with the resolved query.
	 */
	public async read(filter: string, limit?: number): Promise<HGrid> {
		return this.invokeOp(
			'read',
			HDict.make(
				typeof limit === 'number' ? { filter, limit } : { filter }
			).toGrid()
		)
	}

	/**
	 * Read a writable point's priority array.
	 *
	 * https://project-haystack.org/doc/Ops#pointWrite
	 *
	 * @param id The id of the point to read.
	 * @returns The writable point's priority array.
	 */
	public async pointRead(id: string | HRef): Promise<HGrid> {
		// Note: pointWrite is being intentionally used here.
		return this.invokeOp(
			'pointWrite',
			HDict.make({ id: HRef.make(id) }).toGrid()
		)
	}

	/**
	 * Write to a point's priority level.
	 *
	 * https://project-haystack.org/doc/Ops#pointWrite
	 *
	 * @param option.id The id of the point to write.
	 * @param option.level The number from 1 to 17 to write too.
	 * @param option.val Optional value to write. If not defined, the level is set to auto.
	 * @param option.who Optional username performing the write, otherwise user 'dis' is used.
	 * @param option.duration Optional number with duration unit if setting level 8.
	 * @returns The writable point's priority array.
	 */
	public async pointWrite({
		id,
		level,
		val,
		who,
		duration,
	}: {
		id: string | HRef
		level: number
		val?: HVal | HaysonVal
		who?: string
		duration?: number | HNum
	}): Promise<HGrid> {
		const dict = HDict.make({})

		dict.set('id', HRef.make(id))
		dict.set('level', level)

		if (val !== undefined) {
			dict.set('val', val)
		}

		if (typeof who === 'string') {
			dict.set('who', who)
		}

		if (duration || typeof duration === 'number') {
			dict.set('duration', duration)
		}

		return this.invokeOp('pointWrite', dict.toGrid())
	}

	/**
	 * Read time series data from a historized point.
	 *
	 * https://project-haystack.org/doc/Ops#hisRead
	 *
	 * @param id The id of the historized point.
	 * @param range The date range.
	 * @returns The time series data.
	 */
	public async hisRead(
		id: string | HRef,
		range:
			| string
			| HisRange
			| HDate
			| HDateTime
			| [HDate, HDate]
			| [HDateTime, HDateTime]
	): Promise<HGrid> {
		let rangeStr: string

		if (isHVal(range)) {
			rangeStr = range.toZinc()
		} else if (Array.isArray(range)) {
			rangeStr = (range as HVal[])
				.map((val: HVal): string => (val as HVal).toZinc())
				.join(',')
		} else {
			rangeStr = String(range)
		}

		return this.invokeOp(
			'hisRead',
			HDict.make({
				id: HRef.make(id),
				range: HStr.make(rangeStr),
			}).toGrid()
		)
	}

	/**
	 * Write the time series data to the historized point.
	 *
	 * https://project-haystack.org/doc/Ops#hisWrite
	 *
	 * @param id The id of the historized point.
	 * @param data The data to write to the history.
	 * @returns The history data to write.
	 */
	public async hisWrite(
		id: string | HRef,
		data: HDict | HaysonDict | HDict[] | HaysonDict[] | HGrid | HList<HDict>
	): Promise<HGrid> {
		const grid = dictsToGrid(data)
		grid.meta.set('id', HRef.make(id))

		return this.invokeOp('hisWrite', grid)
	}

	/**
	 * Invoke an action on the target record.
	 *
	 * https://project-haystack.org/doc/Ops#invokeAction
	 *
	 * @param id The id of the target record to invoke the action on.
	 * @param action The name of the action to invoke.
	 * @param args Optional arguments for the action.
	 * @returns The result of the action.
	 */
	public async invokeAction(
		id: string | HRef,
		action: string,
		args?: HDict | HaysonDict
	): Promise<HGrid> {
		return this.invokeOp(
			'invokeAction',
			HGrid.make({
				meta: HDict.make({
					id: HRef.make(id),
					action: HStr.make(action),
				}),
				rows: [args ? (makeValue(args) as HDict) : HDict.make()],
			})
		)
	}

	/**
	 * Get the navigation hierarchy at the specified node via its `navId`.
	 * Return the root node if none is specified.
	 *
	 * https://project-haystack.org/doc/Ops#nav
	 *
	 * @param navId Optional navId string, ref, dict or grid. If a dict or grid, the id
	 * must be specified via a navId property.
	 * @returns The navigation.
	 */
	public async nav(
		navId?: string | HRef | HaysonDict | HDict | HGrid
	): Promise<HGrid> {
		let grid: HGrid

		if (navId) {
			if (valueIsKind<HGrid>(navId, Kind.Grid)) {
				grid = navId
			} else if (typeof navId === 'string') {
				grid = HGrid.make([
					HDict.make({
						navId: HRef.make(navId),
					}),
				])
			} else if (valueIsKind<HRef>(navId, Kind.Ref)) {
				grid = HGrid.make([
					HDict.make({
						navId,
					}),
				])
			} else {
				grid = HGrid.make([HDict.make(navId)])
			}
		} else {
			grid = HGrid.make({})
		}

		return this.invokeOp('nav', grid)
	}
}
