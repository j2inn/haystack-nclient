/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HNamespace, HGrid, HVal, HaysonVal } from 'haystack-core'
import {
	addHeader,
	getOpUrl as defaultGetOpUrl,
	getHaystackServiceUrl as defaultGetHaystackServiceUrl,
	getHostServiceUrl as defaultGetHostServiceUrl,
	addStartSlashRemoveEndSlash,
	getOpUrlCallback,
	getHaystackServiceUrlCallback,
	getHostServiceUrlCallback,
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
import { GroupsService } from './groups/GroupService'
import { RolesService } from './roles/RolesService'

/**
 * A high level Haystack Client
 */
export class Client implements ClientServiceConfig {
	/**
	 * The origin of the client.
	 */
	public readonly origin: string

	/**
	 * Fetches the Ops URL.
	 */
	readonly #getOpUrl: getOpUrlCallback

	/**
	 * Fetches the haystack service URL.
	 */
	readonly #getHaystackServiceUrl: getHaystackServiceUrlCallback

	/**
	 * Fetches the host service URL.
	 */
	readonly #getHostServiceUrl: getHostServiceUrlCallback

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
	 * The user groups service
	 */
	public readonly groups: GroupsService

	/**
	 * The user roles service
	 */
	public readonly roles: RolesService

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
	 * @param options.pathPrefix The optional path to be appended to the base URL when making certain requests.
	 * @param options.getOpsUrl Optional function that returns the ops URL to use.
	 * @param options.getHaystackServiceUrl Optional function that returns the haystack service URL to use.
	 * @param options.getHostServiceUrl Optional function that returns the host service URL to use.
	 */
	public constructor({
		base,
		project,
		defs,
		options,
		authBearer,
		fetch,
		getOpUrl,
		getHaystackServiceUrl,
		getHostServiceUrl,
		pathPrefix,
	}: {
		base: URL
		project?: string
		defs?: HNamespace
		options?: RequestInit
		authBearer?: string
		fetch?: FetchMethod
		getOpUrl?: getOpUrlCallback
		getHaystackServiceUrl?: getHaystackServiceUrlCallback
		getHostServiceUrl?: getHostServiceUrlCallback
		pathPrefix?: string
	}) {
		this.origin = base.origin

		const path = base.pathname

		this.#options = options ?? {}

		this.fetch =
			fetch ??
			(globalThis as { globalFetchAdapter?: FetchMethod })
				.globalFetchAdapter ??
			finCsrfFetch

		this.pathPrefix = addStartSlashRemoveEndSlash(pathPrefix?.trim() ?? '')

		this.#getOpUrl = getOpUrl ?? defaultGetOpUrl
		this.#getHaystackServiceUrl =
			getHaystackServiceUrl ?? defaultGetHaystackServiceUrl
		this.#getHostServiceUrl = getHostServiceUrl ?? defaultGetHostServiceUrl

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
		this.groups = new GroupsService(this)
		this.roles = new RolesService(this)

		// Add the authorization bearer token if specified.
		if (typeof authBearer === 'string') {
			addHeader(this.#options, 'Authorization', `Bearer ${authBearer}`)
		}
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
		return this.#getOpUrl({
			origin: this.origin,
			pathPrefix: this.pathPrefix,
			project: this.project || 'sys',
			op,
		})
	}

	/**
	 * Returns the URL for a haystack service.
	 *
	 * @param path The path of the service.
	 * @returns A URL.
	 */
	public getHaystackServiceUrl(service: string): string {
		return this.#getHaystackServiceUrl({
			origin: this.origin,
			pathPrefix: this.pathPrefix,
			project: this.project,
			path: service,
		})
	}

	/**
	 * Returns the URL for a host service.
	 *
	 * @param path The path of the service.
	 * @returns A URL.
	 */
	public getHostServiceUrl(path: string): string {
		return this.#getHostServiceUrl({
			origin: this.origin,
			pathPrefix: this.pathPrefix,
			path,
		})
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
		if (!this.isDefsLoaded()) {
			try {
				this.defs = await (this.#loadDefsPromise ??
					(this.#loadDefsPromise = this.requestDefs()))
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
		return !this.defs.grid.isEmpty()
	}

	/**
	 * @returns A promise that resolves to the service's defs.
	 */
	private async requestDefs(): Promise<HNamespace> {
		const grid = await fetchVal<HGrid>(
			`${this.#getHaystackServiceUrl({
				origin: this.origin,
				pathPrefix: this.pathPrefix,
				project: '',
				path: 'defs',
			})}`,
			{ ...this.getDefaultOptions() },
			this.fetch
		)

		return new HNamespace(grid)
	}

	/**
	 * @returns A JSON object of the Client that uniquely identifies it.
	 */
	public toJSON(): {
		opUrl: string
		haystackServiceUrl: string
		hostServiceUrl: string
		project: string
		pathPrefix: string
	} {
		return {
			opUrl: this.getOpUrl(''),
			haystackServiceUrl: this.getHaystackServiceUrl(''),
			hostServiceUrl: this.getHostServiceUrl(''),
			project: this.project,
			pathPrefix: this.pathPrefix,
		}
	}

	/**
	 * Fetch a haystack value from the server.
	 *
	 * @param resource The resource to request.
	 * @param body Optional haystack value used for the request's body.
	 * @param options Optional object containing any custom settings.
	 * @returns A promise that resolves to a value.
	 * @throws A fetch or grid error.
	 */
	public async fetchVal<T extends HVal>(
		resource: RequestInfo,
		body?: HVal | HaysonVal,
		options?: RequestInit
	): Promise<T> {
		const fetchValOptions = { ...this.getDefaultOptions(), ...options }

		if (body !== undefined) {
			fetchValOptions.body = JSON.stringify(body)

			if (!fetchValOptions.method) {
				fetchValOptions.method = 'POST'
			}
		}

		return fetchVal<T>(resource, fetchValOptions, this.fetch)
	}

	/**
	 * Closes the client.
	 *
	 * Warning: this will close any watches associated with this client. Any
	 * watches may throw an error if they are used after being closed.
	 */
	public async close(): Promise<void> {
		await Promise.all([this.watch.close(), this.ops.watch.close()])
	}
}
