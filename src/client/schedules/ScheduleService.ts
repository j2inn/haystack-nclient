/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HDict, HGrid, HRef } from 'haystack-core'
import {
	ScheduleEventsReadOptions,
	SchedulePointUpdate,
	ScheduleReadOptions,
	ScheduleServiceEndpoints,
} from './types'
import { fetchVal } from '../fetchVal'
import { ClientServiceConfig } from '../ClientServiceConfig'
import { encodeQuery } from '../../util/http'
import { dictsToGrid } from '../../util/hval'

/**
 * An implementation of the FIN schedule service.
 */
export class ScheduleService {
	/**
	 * The client service configuration.
	 */
	readonly #serviceConfig: ClientServiceConfig

	/**
	 * The url for the calendars service.
	 */
	readonly #calendarsUrl: string

	/**
	 * The url for the schedules service.
	 */
	readonly #schedulesUrl: string

	/**
	 * Constructs a new record service object.
	 *
	 * @param serviceConfig Service configuration.
	 */
	constructor(serviceConfig: ClientServiceConfig) {
		this.#serviceConfig = serviceConfig

		this.#calendarsUrl = serviceConfig.getHaystackServiceUrl(
			ScheduleServiceEndpoints.Calendars
		)
		this.#schedulesUrl = serviceConfig.getHaystackServiceUrl(
			ScheduleServiceEndpoints.Schedules
		)
	}

	/**
	 * Query all schedules.
	 *
	 * @param options Optional options for reading schedules.
	 * @returns A grid of schedules.
	 */
	async readAllSchedules<Schedule extends HDict>(
		options?: ScheduleReadOptions
	): Promise<HGrid<Schedule>> {
		return fetchVal<HGrid<Schedule>>(
			`${this.#schedulesUrl}${encodeQuery({
				...(options ?? {}),
			})}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Creates single or multiple schedules.
	 *
	 * @param schedules The schedules to create.
	 * @returns A grid of the created schedules.
	 */
	async createSchedules<Schedule extends HDict>(
		schedules: Schedule | HGrid<Schedule>
	): Promise<HGrid<Schedule>> {
		return fetchVal<HGrid<Schedule>>(
			this.#schedulesUrl,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'POST',
				body: JSON.stringify(dictsToGrid(schedules).toJSON()),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Read a schedule by its id.
	 *
	 * @param id The record id.
	 * @returns A schedule.
	 */
	async readScheduleById<Schedule extends HDict>(
		id: string | HRef
	): Promise<Schedule> {
		return fetchVal<Schedule>(
			`${this.#schedulesUrl}/${HRef.make(id).value}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			}
		)
	}

	/**
	 * Updates a schedule.
	 *
	 * @param id The record id.
	 * @param schedule The schedule.
	 * @returns The updated schedule record.
	 */
	async updateSchedule<Schedule extends HDict>(
		id: string | HRef,
		schedule: HDict
	): Promise<Schedule> {
		return fetchVal<Schedule>(
			`${this.#schedulesUrl}/${HRef.make(id).value}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'PATCH',
				body: JSON.stringify(schedule.toJSON()),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Deletes a schedule by its id.
	 *
	 * @param id The record id.
	 * @returns The deleted schedule.
	 */
	async deleteScheduleById<Schedule extends HDict>(
		id: string | HRef
	): Promise<Schedule> {
		return fetchVal<Schedule>(
			`${this.#schedulesUrl}/${HRef.make(id).value}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'DELETE',
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Reads the calendars associated to a schedule.
	 *
	 * @param id The record id.
	 * @returns A grid of calendars.
	 */
	async readScheduleCalendarsById<Calendar extends HDict>(
		id: string | HRef
	): Promise<HGrid<Calendar>> {
		return fetchVal<HGrid<Calendar>>(
			`${this.#schedulesUrl}/${HRef.make(id).value}/calendars`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			}
		)
	}

	/**
	 * Reads all the schedulable points associated to a schedule.
	 *
	 * @param id The record id.
	 * @param options Schedule read options.
	 * @returns A grid of points.
	 */
	async readSchedulablePoints<SchedulablePoint extends HDict>(
		id: string | HRef,
		options?: ScheduleReadOptions
	): Promise<HGrid<SchedulablePoint>> {
		return fetchVal<HGrid<SchedulablePoint>>(
			`${this.#schedulesUrl}/${HRef.make(id).value}/points${encodeQuery({
				...(options ?? {}),
			})}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Adds or Removes schedulable points to/from a schedule.
	 *
	 * @param id The record id.
	 * @param pointUpdates The schedule point updates.
	 * @returns A grid with the schedule points added/removed.
	 */
	async updateSchedulePoints<SchedulablePoint extends HDict>(
		id: string | HRef,
		pointUpdates: SchedulePointUpdate
	): Promise<HGrid<SchedulablePoint>> {
		return fetchVal<HGrid<SchedulablePoint>>(
			`${this.#schedulesUrl}/${HRef.make(id).value}/points`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'PATCH',
				body: JSON.stringify(pointUpdates),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Query all calendars.
	 *
	 * @param options Optional options for reading calendars.
	 * @returns A grid of calendars.
	 */
	async readAllCalendars<Calendar extends HDict>(
		options?: ScheduleReadOptions
	): Promise<HGrid<Calendar>> {
		return fetchVal<HGrid<Calendar>>(
			`${this.#calendarsUrl}${encodeQuery({
				...(options ?? {}),
			})}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Creates single or multiple calendars.
	 *
	 * @param calendars The calendars to create.
	 * @returns A grid containing the created calendar(s).
	 */
	async createCalendars<Calendar extends HDict>(
		calendars: Calendar | HGrid<Calendar>
	): Promise<HGrid<Calendar>> {
		return fetchVal<HGrid<Calendar>>(
			this.#calendarsUrl,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'POST',
				body: JSON.stringify(dictsToGrid(calendars).toJSON()),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Read a calendar by its id.
	 *
	 * @param id The record id.
	 * @returns The calendar record.
	 */
	async readCalendarById<Calendar extends HDict>(
		id: string | HRef
	): Promise<Calendar> {
		return fetchVal<Calendar>(
			`${this.#calendarsUrl}/${HRef.make(id).value}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			}
		)
	}

	/**
	 * Updates a calendar.
	 *
	 * @param calendar The calendar record.
	 * @returns The updated calendar record.
	 */
	async updateCalendar<Calendar extends HDict>(
		id: string | HRef,
		calendar: HDict
	): Promise<Calendar> {
		return fetchVal<Calendar>(
			`${this.#calendarsUrl}/${HRef.make(id).value}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'PATCH',
				body: JSON.stringify(calendar.toJSON()),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Deletes a calendar by its id.
	 *
	 * @param id The record id.
	 * @returns The deleted calendar.
	 */
	async deleteCalendarById<Calendar extends HDict>(
		id: string | HRef
	): Promise<Calendar> {
		return fetchVal<Calendar>(
			`${this.#calendarsUrl}/${HRef.make(id).value}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'DELETE',
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Reads the schedules associated to a calendar.
	 *
	 * @param id The record id.
	 * @returns A grid of schedules.
	 */
	async readCalendarSchedulesById<Schedule extends HDict>(
		id: string | HRef
	): Promise<HGrid<Schedule>> {
		return fetchVal<HGrid<Schedule>>(
			`${this.#calendarsUrl}/${HRef.make(id).value}/schedules`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			}
		)
	}

	/**
	 * Reads the events associated with a schedule.
	 *
	 * Returns the events within the start -> end range,
	 * or, if no end provided, will return the next scheduled event.
	 *
	 * @param id The record id.
	 * @param options The range to use for event lookup.
	 * @returns The events for the Schedule.
	 */
	async readScheduleEvents<ScheduleEventsResponse extends HDict>(
		id: string | HRef,
		options: ScheduleEventsReadOptions
	): Promise<ScheduleEventsResponse> {
		return fetchVal<ScheduleEventsResponse>(
			`${this.#schedulesUrl}/${HRef.make(id).value}/events${encodeQuery({
				...(options ?? {}),
			})}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			}
		)
	}
}
