/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HNamespace, HGrid } from 'haystack-core'
import {
	addHeader,
	getOpUrl,
	getHaystackServiceUrl,
	getHostServiceUrl,
	sanitizedPrefixPath,
} from '../util/http'
import { RecordService } from './RecordService'
import { ClientServiceConfig } from './ClientServiceConfig'
import { OpsService } from './OpsService'
import { ExtOpsService } from './ExtOpsService'
import { ScheduleService } from './schedules/ScheduleService'
import { finCsrfFetch } from './finCsrfFetch'
import { FetchMethod, fetchVal } from './fetchVal'
import { WatchService } from './watches/WatchService'
import { WatchRestApis } from './watches/WatchRestApis'
import { UserService } from './UserService'
import { ProjectService } from './ProjectService'

/**
 * A high level Haystack Client
 */
export class Client implements ClientServiceConfig {
	/**
	 * The origin of the client.
	 */
	public readonly origin: string

	/**
	 * The default base ops path.
	 */
	public readonly opsBase: string

	/**
	 * The project associated with this client.
	 */
	public readonly project: string

	/**
	 * Is the optional path that is appended to the client origin url
	 */
	public readonly pathPrefix: string

	/**
	 * The defs associated with the client.
	 */
	public defs = new HNamespace(HGrid.make({}))

	/**
	 * The ops service.
	 */
	public readonly ops: OpsService

	/**
	 * The extended ops service.
	 */
	public readonly ext: ExtOpsService

	/**
	 * The record service.
	 */
	public readonly record: RecordService

	/**
	 * The schedule service.
	 */
	public readonly schedule: ScheduleService

	/**
	 * The watch service.
	 */
	public readonly watch: WatchService

	/**
	 * The user service.
	 */
	public readonly user: UserService

	/**
	 * The project service.
	 */
	public readonly proj: ProjectService

	/**
	 * The `fetch` options.
	 */
	readonly #options: RequestInit

	/**
	 * The `fetch` function to use for network communication.
	 */
	public readonly fetch: FetchMethod

	/**
	 * Internal cached load defs promise.
	 */
	#loadDefsPromise?: Promise<HNamespace>

	/**
	 * Internal flag used for loading defs.
	 */
	#defsLoaded = false

	/**
	 * Constructs a new client.
	 *
	 * @param options.base The base URL.
	 * @param options.project An optional project name. Defaults to 'sys'.
	 * @param options.defs An optional instance of defs. If specified, the client will
	 * be set to an intialized state.
	 * @param options.options An optional set of fetch `options` to use with every request
	 * sent from this client.
	 * @param options.authBearer An optional bearer token that will be added to every request sent using
	 * this client. This will add/overwrite any existing `Authorization` header already
	 * added to the `options`.
	 * @param options.fetch An optional fetch function to use for all network requests. If not specified
	 * the FIN CSRF fetch will be used.
	 * @param options.opsBase An optional alternative base path for making ops calls.
	 * @param options.pathPrefix The optional path to be appended to the base URL when making certain requests.
	 */
	public constructor({
		base,
		project,
		defs,
		options,
		authBearer,
		fetch,
		opsBase,
		pathPrefix,
	}: {
		base: URL
		project?: string
		defs?: HNamespace
		options?: RequestInit
		authBearer?: string
		fetch?: FetchMethod
		opsBase?: string
		pathPrefix?: string
	}) {
		this.origin = base.origin

		const path = base.pathname

		this.#options = options ?? {}

		this.fetch = fetch ?? finCsrfFetch
		this.pathPrefix = sanitizedPrefixPath(pathPrefix)

		// If there's no project specified then attempt to detect it.
		this.project =
			project ||
			Client.parseProjectFromProjects(path) ||
			Client.parseProjectFromFinMobile(path) ||
			Client.parseProjectFromApi(path) ||
			''

		if (defs) {
			this.defs = defs
		}

		this.ops = new OpsService(this)
		this.ext = new ExtOpsService(this)
		this.record = new RecordService(this)
		this.schedule = new ScheduleService(this)
		this.watch = new WatchService(this, new WatchRestApis(this))
		this.user = new UserService(this)
		this.proj = new ProjectService(this)

		// Add the authorization bearer token if specified.
		if (typeof authBearer === 'string') {
			addHeader(this.#options, 'Authorization', `Bearer ${authBearer}`)
		}

		this.opsBase = opsBase || 'api'
	}

	private static parseProjectFromFinMobile(path: string): string {
		const res = /^\/finMobile\/([^/?#]+)/.exec(path)
		return (res && res[1]) ?? ''
	}

	private static parseProjectFromApi(path: string): string {
		const res = /^\/api\/([^/?#]+)/.exec(path)
		return (res && res[1]) ?? ''
	}

	private static parseProjectFromProjects(path: string): string {
		const res = /\/projects\/([^/?#]+)/.exec(path)
		return (res && res[1]) ?? ''
	}

	/**
	 * Returns the URL for an op.
	 *
	 * @param op The op to create the URL for.
	 * @returns A URL.
	 */
	public getOpUrl(op: string): string {
		return getOpUrl(
			this.origin,
			this.pathPrefix,
			this.opsBase,
			this.project,
			op
		)
	}

	/**
	 * Returns the URL for a haystack service.
	 *
	 * @param path The path of the service.
	 * @returns A URL.
	 */
	public getHaystackServiceUrl(service: string): string {
		return getHaystackServiceUrl(
			this.origin,
			this.pathPrefix,
			this.project,
			service
		)
	}

	/**
	 * Returns the URL for a host service.
	 *
	 * @param path The path of the service.
	 * @returns A URL.
	 */
	public getHostServiceUrl(path: string): string {
		return getHostServiceUrl(this.origin, this.pathPrefix, path)
	}

	/**
	 * @returns The default options to used with a fetch operation.
	 */
	public getDefaultOptions(): RequestInit {
		return this.#options
	}

	/**
	 * Asynchronously load the defs library using this service.
	 *
	 * Please note, this will overwrite any existing defs loaded.
	 *
	 * @returns A promise that's resolved once the defs have been loaded.
	 */
	public async loadDefs(): Promise<void> {
		if (!this.#defsLoaded) {
			try {
				this.defs = await (this.#loadDefsPromise ??
					(this.#loadDefsPromise = this.requestDefs()))

				this.#defsLoaded = true
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
	public isDefsLoaded(): boolean {
		return this.#defsLoaded
	}

	/**
	 * @returns A promise that resolves to the service's defs.
	 */
	private async requestDefs(): Promise<HNamespace> {
		const grid = await fetchVal<HGrid>(
			`${getHaystackServiceUrl(
				this.origin,
				this.pathPrefix,
				'',
				'defs'
			)}`,
			{ ...this.getDefaultOptions() },
			this.fetch
		)

		return new HNamespace(grid)
	}

	/**
	 * @returns A JSON object of the Client.
	 */
	public toJSON(): {
		origin: string
		opsBase: string
		project: string
		pathPrefix: string
	} {
		return {
			origin: this.origin,
			opsBase: this.opsBase,
			project: this.project,
			pathPrefix: this.pathPrefix,
		}
	}
}
