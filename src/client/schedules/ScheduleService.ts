/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HDict, HGrid, HList, HRef } from 'haystack-core'
import {
	ScheduleReadOptions,
	SchedulePointUpdate,
	Schedule,
	Calendar,
} from './types'
import { fetchVal } from '../fetchVal'
import { ClientServiceConfig } from '../ClientServiceConfig'
import { ScheduleEvent, SchedulePoint } from './types'
import { encodeQuery } from '../../util/http'

export const Schedule_Serv_EndPoints = {
	Schedules: 'schedules',
	Schedule: 'schedules/:id',
	Events: 'schedules/:id/events',
	Points: 'schedules/:id/points',
	ScheduleCalendars: 'schedules/:id/calendars',
	Calendars: 'calendars',
	Calendar: 'calendars/:id',
	CalendarSchedules: 'calendars/:id/schedules',
}

const ID = ':id'

export const enum ScheduleMessages {
	BadRequest = 'Bad Request',
	Invalid = 'Invalid Result',
}

export type ScheduleReadFilterOptions = {
	filter?: string
	options?: ScheduleReadOptions
}

export class ScheduleService {
	/**
	 * The client service configuration.
	 */
	readonly #serviceConfig: ClientServiceConfig

	/**
	 * Constructs a new record service object.
	 *
	 * @param serviceConfig Service configuration.
	 */
	public constructor(serviceConfig: ClientServiceConfig) {
		this.#serviceConfig = serviceConfig
	}

	/**
	 * Reads the schedules via a filter/options. If the filter is not provided, will get all the schedules
	 *
	 * @param readOpts.filter The filter string by which to get the schedules.
	 * @param readOpts.options Optional options when reading via filter
	 * @param readOpts.options.columns Specifies the name(s) of the column(s) to get. If specified only the mentioned columns will be returned.
	 * @param readOpts.options.limit Int value that specifies the max number of records to return
	 * @param readOpts.options.sort Specifies the name(s) of the column(s) to sort the result by (Sorting done in ascending order)
	 *
	 * @returns Resolves to the schedules
	 */
	public async readSchedules(
		readOpts?: ScheduleReadFilterOptions
	): Promise<Schedule[]> {
		const endPoint = Schedule_Serv_EndPoints.Schedules
		const query = encodeQuery({
			...readOpts?.options,
			filter: readOpts?.filter,
		})

		const grid = await fetchVal<HGrid<Schedule>>(
			this.makePath(`${endPoint}${query}`),
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		return grid.getRows()
	}

	/**
	 * Creates the schedule object(s) as specified
	 *
	 * @param rec Is/are the record(s) to be created
	 *
	 * @returns Resolves to the created schedules
	 */
	public async createSchedules(rec: HGrid | HDict): Promise<Schedule[]> {
		const path = Schedule_Serv_EndPoints.Schedules

		const grid = await fetchVal<HGrid<Schedule>>(
			this.makePath(path),
			{
				...this.#serviceConfig.getDefaultOptions(),
				body: JSON.stringify(rec.toJSON()),
				method: 'POST',
			},
			this.#serviceConfig.fetch
		)

		return grid.getRows()
	}

	/**
	 * Gets the schedule identified by its id
	 *
	 * @param id The schedule id
	 *
	 * @returns Resolves to a schedule
	 */
	public async readScheduleById(id: HRef | string): Promise<Schedule> {
		const path = Schedule_Serv_EndPoints.Schedule.replace(
			ID,
			HRef.make(id).value
		)

		return fetchVal(
			this.makePath(path),
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Updates the schedule object
	 *
	 * @param rec the updated schedule object
	 *
	 * @returns Resolves to resolving the updated schedule object
	 */
	public async updateSchedule(rec: HDict): Promise<Schedule> {
		const id = rec.get('id') as HRef
		if (!id) {
			throw new Error(ScheduleMessages.BadRequest)
		}

		const path = Schedule_Serv_EndPoints.Schedule.replace(ID, id.value)

		return fetchVal(
			this.makePath(path),
			{
				...this.#serviceConfig.getDefaultOptions(),
				body: JSON.stringify(rec.toJSON()),
				method: 'PATCH',
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Deletes a schedule object indetified by its id
	 *
	 * @param id the of the schedule object to be deleted
	 *
	 * @return Resolves to the deleted schedule object
	 */
	public async deleteSchedule(id: HRef | string): Promise<Schedule> {
		const path = Schedule_Serv_EndPoints.Schedule.replace(
			ID,
			HRef.make(id).value
		)

		return fetchVal(
			this.makePath(path),
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'DELETE',
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Gets all the events for the schedule object
	 *
	 * @param id the id of the schedule
	 *
	 * @returns Resolves to the events for the read schedule
	 */
	public async readScheduleEvents(
		id: HRef | string
	): Promise<ScheduleEvent[]> {
		const path = Schedule_Serv_EndPoints.Events.replace(
			ID,
			HRef.make(id).value
		)

		const grid = await fetchVal<HGrid<ScheduleEvent>>(
			this.makePath(path),
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		return grid.getRows()
	}

	/**
	 * Updates *all* the events for a schedule object. This will overwrite all the events to
	 * when updating send all the events.
	 *
	 * @param id the id of the schedule object
	 * @param events the updated list of schedule events
	 *
	 * @returns Resolves to the events for the schedule
	 */
	public async updateScheduleEvents(
		id: HRef | string,
		events: HGrid
	): Promise<ScheduleEvent[]> {
		const path = Schedule_Serv_EndPoints.Events.replace(
			ID,
			HRef.make(id).value
		)

		const grid = await fetchVal<HGrid<ScheduleEvent>>(
			this.makePath(path),
			{
				...this.#serviceConfig.getDefaultOptions(),
				body: JSON.stringify(events.toJSON()),
				method: 'PATCH',
			},
			this.#serviceConfig.fetch
		)

		return grid.getRows()
	}

	/**
	 * Read all the points that are associated/scheduled with/by the specified schedule.
	 *
	 * @param id the id of the schedule
	 *
	 * @returns Resovles to all the points scheduled by the schedule
	 */
	public async readSchedulePoints(
		id: HRef | string
	): Promise<SchedulePoint[]> {
		const path = Schedule_Serv_EndPoints.Points.replace(
			ID,
			HRef.make(id).value
		)

		const grid = await fetchVal<HGrid<SchedulePoint>>(
			this.makePath(path),
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		return grid.getRows()
	}

	/**
	 * Updates the schedule points (add/remove)
	 *
	 * @param id the id of the schedule
	 * @param pointsToUpdate points to update
	 * @param pointsToUpdate.add the array of point ids that have to be added
	 * @param pointsToUpdate.remove the array of point ids that have to be removed
	 *
	 * @returns Resolves to a grid of all the updated points
	 */
	public async updateSchedulePoints(
		id: HRef | string,
		pointsToUpdate: SchedulePointUpdate
	): Promise<SchedulePoint[]> {
		if (
			(!pointsToUpdate.add || pointsToUpdate.add.length < 1) &&
			(!pointsToUpdate.remove || pointsToUpdate.remove.length < 1)
		) {
			return []
		}

		const path = Schedule_Serv_EndPoints.Points.replace(
			ID,
			HRef.make(id).value
		)

		const update = HDict.make()

		if (pointsToUpdate.add) {
			update.set('add', HList.make(pointsToUpdate.add))
		}
		if (pointsToUpdate.remove) {
			update.set('remove', HList.make(pointsToUpdate.remove))
		}

		const grid = await fetchVal<HGrid<SchedulePoint>>(
			this.makePath(path),
			{
				...this.#serviceConfig.getDefaultOptions(),
				body: JSON.stringify(update.toJSON()),
				method: 'PATCH',
			},
			this.#serviceConfig.fetch
		)

		return grid.getRows()
	}

	/**
	 * Gets all the calendars that the schedule subscribes to (has event from)
	 *
	 * @param scheduleId the schedule id
	 *
	 * @return Resolves to the calendar objects
	 */
	public async getScheduleCalendars(
		scheduleId: HRef | string
	): Promise<Calendar[]> {
		const path = Schedule_Serv_EndPoints.ScheduleCalendars.replace(
			ID,
			HRef.make(scheduleId).value
		)

		const grid = await fetchVal<HGrid<Calendar>>(
			this.makePath(path),
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		return grid.getRows()
	}

	/**
	 * Reads the calendars via a filter/options. If the filter is not provided, will get all the calendars
	 *
	 * @param readOpts.filter is the filter string to be applied which fetching the calendars
	 * @param readOpts.options are the read options
	 * @param readOpts.options.columns Specifies the name(s) of the column(s) to get. If specified only the mentioned columns will be returned.
	 * @param readOpts.options.limit Int value that specifies the max number of records to return
	 * @param readOpts.options.sort Specifies the name(s) of the column(s) to sort the result by (Sorting done in ascending order)
	 *
	 * @returns A promise resolving calendar objects
	 */
	public async readCalendars(
		readOpts?: ScheduleReadFilterOptions
	): Promise<Calendar[]> {
		const endPoint = Schedule_Serv_EndPoints.Calendars
		const query = encodeQuery({
			...readOpts?.options,
			filter: readOpts?.filter,
		})

		const grid = await fetchVal<HGrid<Calendar>>(
			this.makePath(`${endPoint}${query}`),
			{ ...this.#serviceConfig.getDefaultOptions() },
			this.#serviceConfig.fetch
		)

		return grid.getRows()
	}

	/**
	 * Creates new calendar object(s) as per the data supplied
	 *
	 * @param rec the dict/grid of records that are to be saved as new calendar object(s)
	 *
	 * @returns Resolves to created calendar objects
	 */
	public async createCalendars(rec: HDict | HGrid): Promise<Calendar[]> {
		const path = Schedule_Serv_EndPoints.Calendars

		const grid = await fetchVal<HGrid<Calendar>>(
			this.makePath(path),
			{
				...this.#serviceConfig.getDefaultOptions(),
				body: JSON.stringify(rec.toJSON()),
				method: 'POST',
			},
			this.#serviceConfig.fetch
		)

		return grid.getRows()
	}

	/**
	 * Reads a particular calendar specified/identified by id
	 *
	 * @param calendarId the id of the calendar
	 *
	 * @returns Resolves to a calendar object
	 */
	public async readCalendarById(
		calendarId: HRef | string
	): Promise<Calendar> {
		const path = Schedule_Serv_EndPoints.Calendar.replace(
			ID,
			HRef.make(calendarId).value
		)

		return fetchVal(
			this.makePath(path),
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Updates the calendar object with the current/specified object
	 *
	 * @param calendar the calendar object
	 *
	 * @returns Resolves with the updated calendar object
	 */
	public async updateCalendar(calendar: HDict): Promise<Calendar> {
		const id = calendar.get('id') as HRef
		if (!id) {
			throw new Error(ScheduleMessages.BadRequest)
		}

		const path = Schedule_Serv_EndPoints.Calendar.replace(ID, id.value)

		return fetchVal(
			this.makePath(path),
			{
				...this.#serviceConfig.getDefaultOptions(),
				body: JSON.stringify(calendar.toJSON()),
				method: 'PATCH',
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Deletes a calendar object identified by the id
	 *
	 * @param calendarId the calendar id
	 *
	 * @returns Resolves to the deleted calendar object
	 */
	public async deleteCalendar(calendarId: HRef | string): Promise<Calendar> {
		const path = Schedule_Serv_EndPoints.Calendar.replace(
			ID,
			HRef.make(calendarId).value
		)

		return fetchVal(
			this.makePath(path),
			{
				...this.#serviceConfig.getDefaultOptions(),
				method: 'DELETE',
			},
			this.#serviceConfig.fetch
		)
	}

	/**
	 * Reads all the schedules that the said calendar is subscribed by
	 *
	 * @param calendarId the calendar id
	 *
	 * @returns Resolves to the calendar objects
	 */
	public async getCalendarSchedules(
		calendarId: HRef | string
	): Promise<Schedule[]> {
		const path = Schedule_Serv_EndPoints.CalendarSchedules.replace(
			ID,
			HRef.make(calendarId).value
		)

		const grid = await fetchVal<HGrid<Schedule>>(
			this.makePath(path),
			{
				...this.#serviceConfig.getDefaultOptions(),
			},
			this.#serviceConfig.fetch
		)

		return grid.getRows()
	}

	private makePath(path: string): string {
		return this.#serviceConfig.getHaystackServiceUrl(path)
	}
}
