/*
 * Copyright (c) 2020-2024, J2 Innovations. All Rights Reserved
 */

import { HDateTime, HDict, HList, HRef, OptionalHVal } from 'haystack-core'

/**
 * The entry endpoints for the Schedule Service
 */
export enum ScheduleServiceEndpoints {
	Schedules = 'schedules',
	Calendars = 'calendars',
}

/**
 * Options for reading Schedules and Calendars.
 */
export type ScheduleReadOptions = {
	/**
	 * If defined, Gets the functions filtered by a Haystack filter
	 */
	filter?: string

	/**
	 * If defined, specifies the name of the tag/prop by which the returned function records are sorted in ascending order.
	 */
	sort?: string[]

	/**
	 * If defined, specifies the max number of function records that will be returned by the read
	 */
	limit?: number

	/**
	 * If defined, limit the number of columns sent back in the response.
	 */
	columns?: string[]

	/**
	 * Omit the specified columns from the response.
	 */
	omit?: string[]
}

/**
 * Options for reading a Schedules events.
 */
export type ScheduleEventsReadOptions = {
	start: string
	end?: string
}

interface ScheduleEvent extends HDict {
	startDate: HDateTime
	endDate: HDateTime
	val: OptionalHVal
}

export interface ScheduleEventsResponse extends HDict {
	events: HList<ScheduleEvent>
}

/**
 * Interface for adding and/or removing schedulable points
 */
export interface SchedulePointUpdate {
	add?: HList<HRef>
	remove?: HList<HRef>
}
