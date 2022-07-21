/*
 * Copyright (c) 2022, J2 Innovations. All Rights Reserved
 */

import { makeValue, HDateTime } from 'haystack-core'
import {
	Notification,
	NotificationService,
	NotificationEventHandler,
} from './NotificationService'

const NOTIFICATIONS_POLL_TIMER_MS = 5000

export class NotificationsHandler {
	#opened = false

	/**
	 * Event source used for server push implementation.
	 */
	#eventSource?: EventSource

	/**
	 * The poll interval timeout id.
	 */
	#timerId?: NodeJS.Timeout

	/**
	 * Event and Poll connection status
	 */
	#closed = false

	/**
	 * Time of last notification update.
	 */
	#lastUpdateTime = new Date()

	/**
	 * The notifications service.
	 */
	#notificationService: NotificationService

	/**
	 * The callbacks for notification events.
	 */
	#callbacks: NotificationEventHandler[] = []

	constructor({
		notificationService,
		callbacks,
	}: {
		notificationService: NotificationService
		callbacks: NotificationEventHandler[]
	}) {
		this.#notificationService = notificationService
		this.#callbacks = callbacks
	}

	/**
	 * Opens the connection(s) to receive notifications
	 */
	async open(): Promise<void> {
		this.throwErrorIfClosed()

		if (!this.#opened) {
			this.#opened = true
			await this.start()
		}
	}

	/**
	 * Connect to the EventSource API and attach event handlers
	 * @param client Client - The Haystack Client
	 */
	private async start() {
		const notifications = await this.#notificationService.readAll()
		this.setLastNotificationUpdateTime(notifications)

		this.#eventSource = new EventSource('/api/notifications/push', {
			withCredentials: true,
		})

		this.#eventSource.onmessage = this.onNotificationReceived
		this.#eventSource.onerror = (e) => {
			console.error('event source error', e)
			this.onNotificationPushError()
		}
	}

	/**
	 * On push notification event, parse result and update store
	 * @param event MessageEvent
	 */
	private onNotificationReceived = (event: MessageEvent) => {
		// TODO: Add try/catch for parsing result
		const data = JSON.parse(event.data)
		const notification = makeValue(data) as Notification

		this.callNotificationHandlers([notification])
	}

	/**
	 * Calls the callbacks when new notification(s) received
	 * @param notifications Notifications[]
	 */
	private callNotificationHandlers(notifications: Notification[]) {
		for (const handler of this.#callbacks) {
			try {
				handler(notifications)
			} catch (error) {
				console.error(
					`Error processing notification event`,
					error,
					notifications
				)
			}
		}
	}

	/**
	 * On push notification error, close EventSource and begin poll
	 * @param client Client
	 */
	private onNotificationPushError() {
		try {
			this.#eventSource?.close()
			console.log('event source closed')
		} catch {
			this.#eventSource = undefined
		}

		this.initializePoll()
	}

	/**
	 * Starts a poll on the notifications API, sorting
	 * the requested notifications by time
	 * @param client Client - The Haystack Client
	 */
	private async initializePoll() {
		try {
			this.poll()
		} catch (e) {
			console.error('Error polling notificaitons', e)
		}
	}

	private setLastNotificationUpdateTime(notifications: Notification[]) {
		// this.#lastUpdateTime =
		// 	notifications
		// 		.map((notification) => notification.lastUpdateTime?.date)
		// 		.sort()
		// 		.pop() ?? new Date()

		this.#lastUpdateTime = new Date()
	}

	private poll() {
		this.#timerId = setTimeout(async () => {
			try {
				const newNotifications = await this.#notificationService.poll(
					HDateTime.make(this.#lastUpdateTime)
				)

				if (newNotifications.length > 0) {
					this.callNotificationHandlers(newNotifications)
					this.setLastNotificationUpdateTime(newNotifications)
				}
			} catch (error) {
				console.error(error)
			} finally {
				if (!this.#closed) {
					this.poll()
				}
			}
		}, NOTIFICATIONS_POLL_TIMER_MS)
	}

	/**
	 * Close EventSource API connection and stop API Polling
	 */
	close() {
		this.#closed = true
		this.#eventSource?.close()

		if (this.#timerId) {
			clearTimeout(this.#timerId)
		}

		this.#callbacks = []
	}

	/**
	 * @throws An error if the watch is closed.
	 */
	private throwErrorIfClosed(): void {
		if (this.#closed) {
			throw new Error('Watch is closed')
		}
	}
}
