/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HDict, HGrid, HList, HRef } from 'haystack-core'
import {
	// ScheduleReadOptions,
	SchedulePointUpdate,
	Schedule,
	Calendar,
	CalendarEntry,
	ScheduleReadOptions,
} from './types'
import { fetchVal } from '../fetchVal'
import { ClientServiceConfig } from '../ClientServiceConfig'
import { ScheduleEvent, SchedulePoint } from './types'
import { encodeQuery } from '../../util/http'
import { dictsToGrid } from '../../util/hval'

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
	public constructor(serviceConfig: ClientServiceConfig) {
		this.#serviceConfig = serviceConfig
		this.#calendarsUrl = serviceConfig.getHaystackServiceUrl('calendars')
		this.#schedulesUrl = serviceConfig.getHaystackServiceUrl('schedules')
	}

	// *******************
	// Schedule Operations
	// *******************

	/**
	 * Query all schedules.
	 *
	 * @param options Optional options for reading schedules.
	 * @returns The HGrid result of the schedule read function.
	 */
	public async readAllSchedules(options?: ScheduleReadOptions) {
		return fetchVal<HGrid<T>>(
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
	 * @param schedules HDict | HGrid
	 * @returns A grid containing the created schedules.
	 */
	public async createSchedules(schedules: HDict | HGrid) {
		return fetchVal<HGrid<T>>(
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
	 * @param id string | HRef
	 * @returns The schedule record.
	 */
	public async readScheduleById(id: string | HRef) {
		return fetchVal<HDict<T>>(
			`${this.#schedulesUrl}/${HRef.make(id).value}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			}
		)
	}

	/**
	 * Updates a schedule.
	 *
	 * @param schedule Schedule | HDict
	 * @returns The updated schedule record.
	 */
	public async updateSchedule(schedule: HDict) {
		return fetchVal<HDict<T>>(
			`${this.#schedulesUrl}/${schedule.id?.value ?? ''}`,
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
	 * @param id string | HRef
	 * @returns The deleted schedule.
	 */
	public async deleteScheduleById(id: string | HRef) {
		return fetchVal<T>(
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
	 * @param id string | HRef
	 * @returns HGrid<Calendar>
	 */
	public async readScheduleCalendarsById(
		id: string | HRef
	): Promise<HGrid<CalendarEntry>> {
		return fetchVal<HGrid<CalendarEntry>>(
			`${this.#schedulesUrl}/${HRef.make(id).value}/calendars`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			}
		)
	}

	/**
	 * Reads all the schedulable points associated to a schedule.
	 *
	 * @param id string | HRef
	 * @param options ScheduleReadOptions & { omit?: string[] }
	 * @returns HGrid<SchedulablePoints>
	 */
	public async readSchedulablePoints(
		id: string | HRef,
		options?: ScheduleReadOptions
	): Promise<HGrid<T>> {
		return fetchVal<HGrid<T>>(
			`${this.#schedulesUrl}/${HRef.make(id).value}/points/${encodeQuery({
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
	 * @param id string | HRef
	 * @param pointUpdates SchedulePointUpdate
	 * @returns HGrid with all points that were added or removed.
	 */
	public async updateSchedulePoints(
		id: string | HRef,
		pointUpdates: SchedulePointUpdate
	) {
		return fetchVal<HGrid<T>>(
			`${this.#schedulesUrl}/${HRef.make(id).value}/points/`,
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'PATCH',
				body: JSON.stringify(pointUpdates),
			},
			this.#serviceConfig.fetch
		)
	}

	// *******************
	// Calendar Operations
	// *******************

	/**
	 * Query all calendars.
	 *
	 * @param options Optional options for reading calendars.
	 * @returns The HGrid result of the calendar read function.
	 */
	public async readAllCalendars(options?: ScheduleReadOptions) {
		return fetchVal<HGrid<T>>(
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
	 * @param calendars HDict | HGrid
	 * @returns A grid containing the created calendar(s).
	 */
	public async createCalendars(calendars: HDict | HGrid) {
		return fetchVal<HGrid<T>>(
			this.#schedulesUrl,
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
	 * @param id string | HRef
	 * @returns The calendar record.
	 */
	public async readCalendarById(id: string | HRef) {
		return fetchVal<HDict<T>>(
			`${this.#calendarsUrl}/${HRef.make(id).value}`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			}
		)
	}

	/**
	 * Updates a calendar.
	 *
	 * @param schedule Calendar | HDict
	 * @returns The updated calendar record.
	 */
	public async updateCalendar(calendar: HDict) {
		return fetchVal<HDict<T>>(
			`${this.#calendarsUrl}/${calendar.id?.value ?? ''}`,
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
	 * @param id string | HRef
	 * @returns The deleted calendar.
	 */
	public async deleteCalendarById(id: string | HRef) {
		return fetchVal<T>(
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
	 * @param id string | HRef
	 * @returns HGrid<Schedule>
	 */
	public async readCalendarSchedulesById(
		id: string | HRef
	): Promise<HGrid<CalendarEntry>> {
		return fetchVal<HGrid<CalendarEntry>>(
			`${this.#schedulesUrl}/${HRef.make(id).value}/schedules`,
			{
				...this.#serviceConfig.getDefaultOptions(),
			}
		)
	}
}
