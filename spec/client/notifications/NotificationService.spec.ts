/*
 * Copyright (c) 2021, J2 Innovations. All Rights Reserved
 */

import {
	HGrid,
	HDict,
	HAYSON_MIME_TYPE,
	HSymbol,
	HStr,
	HRef,
	HList,
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

	let notification: NotificationService

	const mockNotification = {
		targetApp: HStr.make('code'),
		topic: HStr.make('topic'),
		kind: 'alarm',
		state: 'active',
	} as Notification

	function prepareMock(verb: string, resp: HDict | HList): void {
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

		notification = new NotificationService<Notification>(
			new Client({ base: new URL(base), project: 'demo', fetch })
		)
	}

	// function getLastBody(): string {
	// 	return (fetchMock.lastCall()?.[1]?.body as string) ?? ''
	// }

	describe('#readAll()', function (): void {
		let dicts: Notification[]

		beforeEach(function (): void {
			dicts = [mockNotification]

			prepareMock('GET', HList.make(dicts))
		})

		it('encodes a GET for a notification', async function (): Promise<void> {
			await notification.readAll()

			expect(fetchMock.lastUrl()).toBe(
				`${getServiceUrl({
					origin: base,
					path: 'notifications',
				})}`
			)
		})

		it('returns a notification found', async function (): Promise<void> {
			expect(await notification.readAll()).toEqual(
				HList.make(dicts).toArray()
			)
		})
	}) // #readAll()

	describe('#readAllTopics()', function (): void {
		const topics = ['test', 'core', 'host']

		beforeEach(function (): void {
			prepareMock('GET', HList.make(...topics))
		})

		it('encodes a GET for a notification', async function (): Promise<void> {
			await notification.readAll()

			expect(fetchMock.lastUrl()).toBe(
				`${getServiceUrl({
					origin: base,
					path: 'notifications',
				})}`
			)
		})

		it('returns a notification found', async function (): Promise<void> {
			expect(await notification.readAll()).toEqual(
				HList.make(topics).toArray()
			)
		})
	}) // #readAllTopics()
})
