/*
 * Copyright (c) 2022, J2 Innovations. All Rights Reserved
 */

import {
	HDict,
	HAYSON_MIME_TYPE,
	HStr,
	HRef,
	HList,
	HDateTime,
} from 'haystack-core'
import { getServiceUrl } from '../../../src/util/http'
import { Client } from '../../../src/client/Client'
import {
	NotificationService,
	Notification,
} from '../../../src/client/notifications/NotificationService'
import fetchMock from 'fetch-mock'

describe('NotificationService', function (): void {
	const base = 'http://localhost:8080'

	let notificationService: NotificationService

	const mockNotification = {
		targetApp: HStr.make('code'),
		topic: HStr.make('topic'),
		kind: 'alarm',
		state: HStr.make('active'),
	} as Notification

	function prepareMock(verb: string, resp: HDict | HList | HRef): void {
		fetchMock.reset().mock(
			`begin:${getServiceUrl({
				origin: base,
				path: 'notifications',
			})}`,
			{
				body: resp.toJSON(),
				headers: { 'content-type': HAYSON_MIME_TYPE },
			},
			{ method: verb }
		)

		notificationService = new NotificationService<Notification>(
			new Client({ base: new URL(base), project: 'demo', fetch })
		)
	}

	function getLastBody(): string {
		return (fetchMock.lastCall()?.[1]?.body as string) ?? ''
	}

	describe('#readAll()', function (): void {
		beforeEach(function (): void {
			prepareMock('GET', HList.make(mockNotification))
		})

		it('encodes a GET for a notification', async function (): Promise<void> {
			await notificationService.readAll()

			expect(fetchMock.lastUrl()).toBe(
				`${getServiceUrl({
					origin: base,
					path: 'notifications',
				})}`
			)
		})

		it('returns a notification found', async function (): Promise<void> {
			expect(await notificationService.readAll()).toEqual(
				HList.make(mockNotification).toArray()
			)
		})
	}) // #readAll()

	describe('#readAllTopics()', function (): void {
		const topics = [HStr.make('test'), HStr.make('foo'), HStr.make('bar')]

		beforeEach(function (): void {
			prepareMock('GET', HList.make(topics))
		})

		it('encodes a GET for a notification', async function (): Promise<void> {
			await notificationService.readAll()

			expect(fetchMock.lastUrl()).toBe(
				`${getServiceUrl({
					origin: base,
					path: 'notifications',
				})}`
			)
		})

		it('returns a notifications found', async function (): Promise<void> {
			expect(await notificationService.readAll()).toEqual(
				HList.make(topics).toArray()
			)
		})
	}) // #readAllTopics()

	describe('#readAllCurrentFiltered()', function (): void {
		beforeEach(function (): void {
			prepareMock('GET', HList.make(mockNotification))
		})

		it('encodes a GET for current notifications', async function (): Promise<void> {
			await notificationService.readAllCurrentFiltered()

			expect(fetchMock.lastUrl()).toBe(
				`${getServiceUrl({
					origin: base,
					path: 'notifications/current',
				})}?filter=`
			)
		})

		it('encodes a GET for current notifications with a filter', async function (): Promise<void> {
			await notificationService.readAllCurrentFiltered('site')

			expect(fetchMock.lastUrl()).toBe(
				`${getServiceUrl({
					origin: base,
					path: 'notifications/current',
				})}?filter=site`
			)
		})

		it('returns a notification found', async function (): Promise<void> {
			expect(await notificationService.readAll()).toEqual(
				HList.make(mockNotification).toArray()
			)
		})
	}) // #readAllCurrentFiltered()

	describe('#readByTopicFilter()', function (): void {
		beforeEach(function (): void {
			prepareMock('GET', HDict.make(mockNotification))
		})

		it('encodes a GET for topics', async function (): Promise<void> {
			await notificationService.readByTopicFilter()

			expect(fetchMock.lastUrl()).toBe(
				`${getServiceUrl({
					origin: base,
					path: 'notifications/topics',
				})}?filter=`
			)
		})

		it('encodes a GET for topics with a filter', async function (): Promise<void> {
			await notificationService.readByTopicFilter('topic')

			expect(fetchMock.lastUrl()).toBe(
				`${getServiceUrl({
					origin: base,
					path: 'notifications/topics',
				})}?filter=topic`
			)
		})
	}) // #readByTopicFilter()

	describe('#create()', function (): void {
		const notification = HDict.make(mockNotification)

		beforeEach(function (): void {
			prepareMock('POST', HRef.make('id'))
		})

		it('encodes a POST to create an notification', async function (): Promise<void> {
			await notificationService.create(mockNotification)

			expect(fetchMock.lastUrl()).toBe(
				`${getServiceUrl({
					origin: base,
					path: 'notifications',
				})}`
			)

			expect(getLastBody()).toEqual(JSON.stringify(notification.toJSON()))
		})
	}) // #create()

	describe('#poll()', function (): void {
		const date = HDateTime.make(new Date())

		beforeEach(function (): void {
			prepareMock('POST', HList.make(mockNotification))
		})

		it('encodes a POST to poll an notification', async function (): Promise<void> {
			await notificationService.poll(date)

			expect(fetchMock.lastUrl()).toBe(
				`${getServiceUrl({
					origin: base,
					path: 'notifications/poll',
				})}`
			)

			expect(getLastBody()).toEqual(JSON.stringify(date.toJSON()))
		})
	}) // #poll()

	describe('#resolve()', function (): void {
		const id = HRef.make('foo')

		beforeEach(function (): void {
			prepareMock('PATCH', HDict.make(id))
		})

		it('encodes a PATCH to resolve an notification', async function (): Promise<void> {
			await notificationService.resolve('foo')

			expect(fetchMock.lastUrl()).toBe(
				`${getServiceUrl({
					origin: base,
					path: 'notifications/resolve',
				})}/foo`
			)
		})
	}) // #poll()
})
