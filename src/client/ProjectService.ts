/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { ClientServiceConfig } from './ClientServiceConfig'
import { HDict, HStr } from 'haystack-core'
import { HGrid, HaysonDict, HMarker } from 'haystack-core'
import { fetchVal } from './fetchVal'

/**
 * A project record.
 */
export interface Project extends HDict {
	proj: HMarker
	projName: HStr
}

/**
 * An implementation of the FIN project service.
 */
export class ProjectService<ProjectType extends Project = Project> {
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
	constructor(serviceConfig: ClientServiceConfig) {
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
	async readByName(name: string): Promise<ProjectType> {
		const project = await fetchVal<ProjectType>(
			`${this.#url}/${name}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		return project as ProjectType
	}

	/**
	 * Query all projects.
	 *
	 * @returns The result of the read operation.
	 */
	async readAll(): Promise<HGrid<ProjectType>> {
		return fetchVal<HGrid<ProjectType>>(
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
	async createProject(
		project: ProjectType | HaysonDict
	): Promise<ProjectType> {
		return await fetchVal<ProjectType>(
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
	async update(project: ProjectType | HaysonDict): Promise<ProjectType> {
		const projectDict = HDict.make(project) as ProjectType

		return fetchVal<ProjectType>(
			`${this.#url}/${projectDict.get<HStr>('projName')?.value ?? ''}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'PATCH',
				body: JSON.stringify(projectDict.toJSON()),
			},
			this.#serviceConfig.fetch
		)
	}
}
