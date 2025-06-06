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
	getServiceUrl as defaultgetServiceUrl,
	getServiceUrlCallback,
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
import { NotificationService } from './notifications/NotificationService'
import { NotificationSettingsService } from './notifications/NotificationSettingService'
import { FunctionService } from './functions/FunctionService'

/**
 * A high level Haystack Client
 */
export class Client implements ClientServiceConfig {
	/**
	 * The origin of the client.
	 */
	readonly origin: string

	/**
	 * Fetches the API url
	 */

	readonly #getServiceUrl: getServiceUrlCallback

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
	readonly project: string

	/**
	 * Is the optional path that is appended to the client origin url
	 */
	readonly pathPrefix: string

	/**
	 * The defs associated with the client.
	 */
	defs = new HNamespace(HGrid.make({}))

	/**
	 * The ops service.
	 */
	readonly ops: OpsService

	/**
	 * The extended ops service.
	 */
	readonly ext: ExtOpsService

	/**
	 * The record service.
	 */
	readonly record: RecordService

	/**
	 * The schedule service.
	 */
	readonly schedule: ScheduleService

	/**
	 * The watch service.
	 */
	readonly watch: WatchService

	/**
	 * The user service.
	 */
	readonly user: UserService

	/**
	 * The user groups service
	 */
	readonly groups: GroupsService

	/**
	 * The user roles service
	 */
	readonly roles: RolesService

	/**
	 * The project service.
	 */
	readonly proj: ProjectService

	/**
	 * The notifications service.
	 */
	readonly notifications: NotificationService

	/**
	 * The notifications settings service.
	 */
	readonly notificationsSettings: NotificationSettingsService

	/**
	 * The functions service
	 */
	readonly functions: FunctionService

	/**
	 * The `fetch` options.
	 */
	readonly #options: RequestInit

	/**
	 * The `fetch` function to use for network communication.
	 */
	readonly fetch: FetchMethod

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
	constructor({
		base,
		project,
		defs,
		options,
		authBearer,
		fetch,
		getServiceUrl,
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
		getServiceUrl?: getServiceUrlCallback
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

		this.#getServiceUrl = getServiceUrl ?? defaultgetServiceUrl
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
		this.notifications = new NotificationService(this)
		this.notificationsSettings = new NotificationSettingsService(this)
		this.functions = new FunctionService(this)

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
	 * Returns the origin API Url
	 *
	 * @param path Name of the API
	 * @returns A URL.
	 */
	getServiceUrl(path: string) {
		return this.#getServiceUrl({
			origin: this.origin,
			path,
		})
	}

	/**
	 * Returns the URL for an op.
	 *
	 * @param op The op to create the URL for.
	 * @returns A URL.
	 */
	getOpUrl(op: string): string {
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
	getHaystackServiceUrl(service: string): string {
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
	getHostServiceUrl(path: string): string {
		return this.#getHostServiceUrl({
			origin: this.origin,
			pathPrefix: this.pathPrefix,
			path,
		})
	}

	/**
	 * @returns The default options to used with a fetch operation.
	 */
	getDefaultOptions(): RequestInit {
		return this.#options
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
	isDefsLoaded(): boolean {
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
	toJSON(): {
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
	async fetchVal<T extends HVal>(
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
	async close(): Promise<void> {
		await Promise.all([this.watch.close(), this.ops.watch.close()])
	}
}
