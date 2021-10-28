import { HDict, HGrid, HMarker, HRef } from 'haystack-core'
import { ClientServiceConfig } from '../ClientServiceConfig'
import { fetchVal } from '../fetchVal'

interface Role extends HDict {
	id: HRef
	userRole: HMarker
}

export class RolesService<T extends Role = Role> {
	/**
	 * The client service configuration.
	 */
	readonly #serviceConfig: ClientServiceConfig

	/**
	 * The url for the service.
	 */
	readonly #url: string

	public constructor(serviceConfig: ClientServiceConfig) {
		this.#serviceConfig = serviceConfig
		this.#url = serviceConfig.getHostServiceUrl('roles')
	}

	public async readAll(): Promise<T[]> {
		const roles = await fetchVal<HGrid<T>>(
			`${this.#url}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		if (roles.isEmpty()) {
			return []
		}

		return roles.getRows()
	}

	public async readRoleById(id: string | HRef): Promise<T> {
		const role = await fetchVal<T>(
			`${this.#url}/${HRef.make(id).value}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		return role
	}

	public async createRoles(roles: T | T[]): Promise<T> {
		return fetchVal<T>(
			`${this.#url}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'POST',
				body: JSON.stringify(HDict.make(roles.toDict()).toJSON()),
			},
			this.#serviceConfig.fetch
		)
	}

	public async deleteRole(id: string | HRef): Promise<void> {
		await fetchVal<T>(
			`${this.#url}/${HRef.make(id).value}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'DELETE',
			},
			this.#serviceConfig.fetch
		)
	}

	public async updateRole(id: string | HRef): Promise<T> {
		return fetchVal<T>(
			`${this.#url}/${HRef.make(id).value}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'PATCH',
			},
			this.#serviceConfig.fetch
		)
	}
}
