/*
 * Copyright (c) 2022, J2 Innovations. All Rights Reserved
 */

import { HDict, HList, HNum, HRef, HStr } from 'haystack-core'
import { ClientServiceConfig } from '../ClientServiceConfig'
import { fetchVal } from '../fetchVal'

export interface TopicSetting extends HDict {
	topic: HStr
	dis?: HStr
	description?: HStr
}

export interface UserViewSetting extends HDict {
	topic: HStr
	kind: HStr
	filter?: HStr
}

export interface SystemPurgeSetting extends HDict {
	kind: HStr
	purgeInterval: HNum
}

/**
 * An implementation of the FIN Settings Notification service.
 */
export class NotificationSettingsService {
	/**
	 * The client service configuration.
	 */
	readonly #serviceConfig: ClientServiceConfig

	/**
	 * The url for the service.
	 */
	readonly #url: string

	/**
	 * Constructs a new notifications service object.
	 *
	 * @param serviceConfig Service configuration.
	 */
	public constructor(serviceConfig: ClientServiceConfig) {
		this.#serviceConfig = serviceConfig
		this.#url = serviceConfig.getServiceUrl('notifications/settings')
	}

	/**
	 * Get all the notification settings topics
	 *
	 * @returns The result of the read operation.
	 */
	public async readTopics(): Promise<TopicSetting[]> {
		const topics = await fetchVal<HList<TopicSetting>>(
			`${this.#url}/topics`,
			{
				method: 'GET',
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		return topics.toArray()
	}

	/**
	 * Adds or updates a topic description.
	 * Note: Setting role descriptions is an operation that requires a super user role.
	 *
	 * @param topicDescription The topic description object
	 * @returns Returns the id of the topic description that was either created or updated.
	 */
	public async setTopicSetting(topicSetting: TopicSetting): Promise<HRef> {
		const updatedTopicId = await fetchVal<HRef>(
			`${this.#url}/topics`,
			{
				method: 'POST',
				...this.#serviceConfig.getDefaultOptions(),
				body: JSON.stringify(topicSetting.toJSON()),
			},
			this.#serviceConfig.fetch
		)

		return updatedTopicId
	}

	/**
	 * Get the view notifications settings for the current user.
	 *
	 * @returns Returns the view settings for the current users.
	 */
	public async readUserViews(): Promise<UserViewSetting[]> {
		const views = await fetchVal<HList<UserViewSetting>>(
			`${this.#url}/view`,
			{
				method: 'GET',
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		return views.toArray()
	}

	/**
	 * Sets a notification view setting for the current user.
	 * @param viewSetting The setting object
	 * @returns Returns the id of the setting that was either created or updated.
	 */
	public async setUserViewSetting(
		userViewSetting: UserViewSetting
	): Promise<HRef> {
		const updatedViewSetting = await fetchVal<HRef>(
			`${this.#url}/view`,
			{
				method: 'POST',
				...this.#serviceConfig.getDefaultOptions(),
				body: JSON.stringify(userViewSetting.toJSON()),
			},
			this.#serviceConfig.fetch
		)

		return updatedViewSetting
	}

	/**
	 * Get the system wide purge notifications settings.
	 *
	 * @returns Returns the system purge settings.
	 */
	public async readPurgeSettings(): Promise<SystemPurgeSetting[]> {
		const purgeSettings = await fetchVal<HList<SystemPurgeSetting>>(
			`${this.#url}/purge`,
			{
				method: 'GET',
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		return purgeSettings.toArray()
	}

	/**
	 * Sets a notification purge setting.
	 * @param purgeSetting The setting object
	 * @returns Returns the id of the setting that was either created or updated.
	 */
	public async setPurgeSettings(
		systemPurgeSetting: SystemPurgeSetting
	): Promise<HRef> {
		const updatedPurgeSetting = await fetchVal<HRef>(
			`${this.#url}/purge`,
			{
				method: 'POST',
				...this.#serviceConfig.getDefaultOptions(),
				body: JSON.stringify(systemPurgeSetting.toJSON()),
			},
			this.#serviceConfig.fetch
		)

		return updatedPurgeSetting
	}
}
