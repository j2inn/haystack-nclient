/*
 * Copyright (c) 2022, J2 Innovations. All Rights Reserved
 */

import { HDict, HAYSON_MIME_TYPE, HStr, HRef, HList, HNum } from 'haystack-core'
import { getServiceUrl } from '../../../src/util/http'
import { Client } from '../../../src/client/Client'
import {
	NotificationSettingsService,
	TopicSetting,
	UserViewSetting,
	SystemPurgeSetting,
} from '../../../src/client/notifications/NotificationSettingService'
import fetchMock from 'fetch-mock'

describe('NotificationSettingService', function (): void {
	const base = 'http://localhost:8080'

	let notificationSettingService: NotificationSettingsService

	function prepareMock(verb: string, resp: HDict | HList | HRef): void {
		fetchMock.reset().mock(
			`begin:${getServiceUrl({
				origin: base,
				path: 'notifications/settings',
			})}`,
			{
				body: resp.toJSON(),
				headers: { 'content-type': HAYSON_MIME_TYPE },
			},
			{ method: verb }
		)

		notificationSettingService = new NotificationSettingsService(
			new Client({ base: new URL(base), project: 'demo', fetch })
		)
	}

	function getLastBody(): string {
		return (fetchMock.lastCall()?.[1]?.body as string) ?? ''
	}

	describe('#readTopics()', function (): void {
		const topicSetting: TopicSetting = HDict.make({
			topic: HStr.make('foo'),
		})

		beforeEach(function (): void {
			prepareMock('GET', HList.make(topicSetting))
		})

		it('encodes a GET for reading setting topics', async function (): Promise<void> {
			await notificationSettingService.readTopics()

			expect(fetchMock.lastUrl()).toBe(
				`${getServiceUrl({
					origin: base,
					path: 'notifications/settings/topics',
				})}`
			)
		})

		it('returns topics found', async function (): Promise<void> {
			expect(await notificationSettingService.readTopics()).toEqual(
				HList.make(topicSetting).toArray()
			)
		})
	}) // #readTopics()

	describe('#setTopicSetting()', function (): void {
		const topicSetting: TopicSetting = HDict.make({
			topic: HStr.make('foo'),
			description: HStr.make('this is a topic description'),
		})

		beforeEach(function (): void {
			prepareMock('POST', HRef.make('id'))
		})

		it('encodes a POST to update a topic setting', async function (): Promise<void> {
			await notificationSettingService.setTopicSetting(topicSetting)

			expect(fetchMock.lastUrl()).toBe(
				`${getServiceUrl({
					origin: base,
					path: 'notifications/settings/topics',
				})}`
			)

			expect(getLastBody()).toEqual(JSON.stringify(topicSetting.toJSON()))
		})
	}) // #setTopicSetting()

	describe('#readUserViews()', function (): void {
		const userViewSetting: UserViewSetting = HDict.make({
			topic: HStr.make('foo'),
			kind: HStr.make('bar'),
		})

		beforeEach(function (): void {
			prepareMock('GET', HList.make(userViewSetting))
		})

		it('encodes a GET for reading user view notification settings', async function (): Promise<void> {
			await notificationSettingService.readUserViews()

			expect(fetchMock.lastUrl()).toBe(
				`${getServiceUrl({
					origin: base,
					path: 'notifications/settings/view',
				})}`
			)
		})

		it('returns user view settings found', async function (): Promise<void> {
			expect(await notificationSettingService.readUserViews()).toEqual(
				HList.make(userViewSetting).toArray()
			)
		})
	}) // #readUserViews()

	describe('#setUserViewSetting()', function (): void {
		const userViewSetting: UserViewSetting = HDict.make({
			topic: HStr.make('foo'),
			kind: HStr.make('bar'),
		})

		beforeEach(function (): void {
			prepareMock('POST', HRef.make('id'))
		})

		it('encodes a POST to update a user view setting', async function (): Promise<void> {
			await notificationSettingService.setUserViewSetting(userViewSetting)

			expect(fetchMock.lastUrl()).toBe(
				`${getServiceUrl({
					origin: base,
					path: 'notifications/settings/view',
				})}`
			)

			expect(getLastBody()).toEqual(
				JSON.stringify(userViewSetting.toJSON())
			)
		})
	}) // #setUserViewSetting()

	describe('#readPurgeSettings()', function (): void {
		const systemPurgeSetting: SystemPurgeSetting = HDict.make({
			kind: HStr.make('foo'),
			purgeInterval: HNum.make(1000),
		})

		beforeEach(function (): void {
			prepareMock('GET', HList.make(systemPurgeSetting))
		})

		it('encodes a GET for reading system purge notification settings', async function (): Promise<void> {
			await notificationSettingService.readPurgeSettings()

			expect(fetchMock.lastUrl()).toBe(
				`${getServiceUrl({
					origin: base,
					path: 'notifications/settings/purge',
				})}`
			)
		})

		it('returns system purge settings found', async function (): Promise<void> {
			expect(
				await notificationSettingService.readPurgeSettings()
			).toEqual(HList.make(systemPurgeSetting).toArray())
		})
	}) // #readPurgeSettings()

	describe('#setPurgeSettings()', function (): void {
		const systemPurgeSetting: SystemPurgeSetting = HDict.make({
			kind: HStr.make('foo'),
			purgeInterval: HNum.make(1000),
		})

		beforeEach(function (): void {
			prepareMock('POST', HRef.make('id'))
		})

		it('encodes a POST to update a system purge notification setting', async function (): Promise<void> {
			await notificationSettingService.setPurgeSettings(
				systemPurgeSetting
			)

			expect(fetchMock.lastUrl()).toBe(
				`${getServiceUrl({
					origin: base,
					path: 'notifications/settings/purge',
				})}`
			)

			expect(getLastBody()).toEqual(
				JSON.stringify(systemPurgeSetting.toJSON())
			)
		})
	}) // #setPurgeSettings()
})
