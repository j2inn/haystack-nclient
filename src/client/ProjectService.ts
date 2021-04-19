/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { ClientServiceConfig } from './ClientServiceConfig'
import { HDict, HStr } from 'haystack-core'
import { HGrid, HaysonDict } from 'haystack-core'
import { fetchVal } from './fetchVal'

/**
 * A project record.
 */
export interface Project extends HDict {
	name?: HStr
	meta?: HDict
}

/**
 * An implementation of the FIN project service.
 */
export class ProjectService {
	/**
	 * The client service configuration.
	 */
	readonly #serviceConfig: ClientServiceConfig

	/**
	 * The url for the service.
	 */
	readonly #url: string

	/**
	 * Constructs a new project service object.
	 *
	 * @param serviceConfig Service configuration.
	 */
	public constructor(serviceConfig: ClientServiceConfig) {
		this.#serviceConfig = serviceConfig
		this.#url = serviceConfig.getHostServiceUrl('projects')
	}

	/**
	 * Read a project via its name.
	 *
	 * @param name The name of the project to read.
	 * @returns The project record.
	 * @throws An error if the project can't be found.
	 */
	public async readByName(name: string): Promise<Project> {
		const project = await fetchVal<Project>(
			`${this.#url}/${name}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		return project as Project
	}

	/**
	 * Query all projects.
	 *
	 * @returns The result of the read operation.
	 */
	public async readAll(): Promise<HGrid<Project>> {
		return fetchVal<HGrid<Project>>(
			this.#url,
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Create a project.
	 *
	 * @params project The project to create.
	 * @returns The created project. Please note, the record only contains the name.
	 */
	public async createProject(
		project: Project | HaysonDict
	): Promise<Project> {
		return await fetchVal<Project>(
			this.#url,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'POST',
				body: JSON.stringify(HDict.make(project).toJSON()),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Update a project record.
	 *
	 * @param project The project record to update.
	 * @returns A updated project record.
	 */
	public async update(project: Project | HaysonDict): Promise<Project> {
		const projectDict = HDict.make(project) as Project

		return fetchVal<Project>(
			`${this.#url}/${projectDict.get<HStr>('name')?.value ?? ''}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'PATCH',
				body: JSON.stringify(projectDict.toJSON()),
			},
			this.#serviceConfig.fetch
		)
	}
}
