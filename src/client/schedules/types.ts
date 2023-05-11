/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import {
	HDate,
	HDateTime,
	HDict,
	HList,
	HMarker,
	HNum,
	HRef,
	HStr,
	OptionalHVal,
	Kind,
} from 'haystack-core'

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
 * Object defining the Schedulable point
 */
export interface SchedulablePoint extends HDict {
	/**
	 * id of the point
	 */
	id: HRef

	/**
	 * Name of the point.
	 */
	dis: HStr

	/**
	 * Is the schedule kind (bool, number, str).
	 */
	kind: Kind

	/**
	 * Marker tag describing the object as a point
	 */
	point: HMarker

	/**
	 * Is the date-time when the point was last modified
	 */
	mod?: HDateTime

	/**
	 * Is the number specifying to what priority on the point should the
	 * schedule be writing on. Range 1-15
	 */
	schedulable: number

	/**
	 * Is the schedule that is writing to the point
	 */
	scheduleRef: HRef
}

/**
 * Interface for adding and/or removing schedulable points
 */
export interface SchedulePointUpdate {
	add?: HList<HRef>
	remove?: HList<HRef>
}

/**
 * Schedule object.
 */
export interface Schedule extends HDict {
	/**
	 * id of the schedule object.
	 */
	id?: HRef

	/**
	 * Specifies the name of the schedule.
	 */
	dis: HStr

	/**
	 * Is the date-time when the schedule was last modified.
	 */
	mod?: HDateTime

	/**
	 * The required timezone of the schedule.
	 */
	tz: HStr

	/**
	 * Is the current value of the schedule.
	 */
	curVal?: OptionalHVal

	/**
	 * Is the schedule kind (bool, number, str).
	 */
	kind: Kind

	/**
	 * Is the list of calendar(s) the schedule subscribes to.
	 */
	calendarRefs?: HList<HRef>

	/**
	 * Specifies the default value of the schedule (if any).
	 */
	defaultVal?: OptionalHVal

	/**
	 * Is the next value of the schedule (whenever it changes).
	 */
	nextVal?: OptionalHVal

	/**
	 * Specifies the date-time when the value of schedule will update next.
	 */
	nextTime?: HDateTime

	/**
	 * Is the range of dates (if any) that the schedule is active.
	 */
	effectivePeriod: CalendarRange

	/**
	 * One week of schedules per day.
	 */
	weeklySchedule?: HList<WeekDaySchedule>

	/**
	 * The scheduled exceptions.
	 */
	exceptionSchedule?: ExceptionSchedule
}

/**
 * Defines the day of week and schedule for that day.
 */
export interface WeekDaySchedule extends HDict {
	dayOfWeek: HNum
	dailySchedule: HList<DailySchedule>
}

/**
 * A List of Schedules Exceptions.
 */
export type ExceptionSchedule = HList<SpecialEvent>

/**
 * Defines data for a special event.
 */
export interface SpecialEvent extends HDict {
	calendarEntry?: CalendarEntry
	calendarRef?: HRef
	priority: number
	dailySchedule: HList<DailySchedule>
}

/**
 * Defines the schedule for a day.
 */
export interface DailySchedule extends HDict {
	bacnetTime: {
		hour?: number
		minute?: number
		second?: number
		hundredths?: number
	}
	scheduledVal: OptionalHVal
}

/**
 * The Calendar object.
 */
export interface Calendar extends HDict {
	/**
	 * Is the id of the calendar object.
	 */
	id?: HRef

	/**
	 * Specifies the name of the calendar.
	 */
	dis?: HStr

	/**
	 * Is the date-time when the calendar was last modified
	 */
	mod?: HDateTime

	/**
	 * The Marker tag describing as calendar.
	 */
	calender: HMarker

	/**
	 * The Ref of the calendar.
	 */
	calendarRef?: HRef

	/**
	 * The calendar entries
	 */
	entries?: CalendarEntry[]
}

/**
 * A Calendar Entry.
 */
export type CalendarEntry =
	| ({ entryType: 'Date' } & CalendarDate)
	| ({ entryType: 'Range' } & CalendarRange)
	| ({ entryType: 'WeekNDay' } & CalendarWeekNDay)

/**
 * A Date for a Calendar.
 */
export interface CalendarDate {
	year?: number
	month?: number
	dayOfMonth?: number
	dayOfWeek?: number
}

/**
 * The Date range of a Calendar.
 */
export interface CalendarRange {
	lowBound?: HDate
	upBound?: HDate
}

/**
 * Define the week and day of a Calendar.
 */
export interface CalendarWeekNDay {
	weekOfMonth?: number
	month?: number
	dayOfWeek?: number
}
