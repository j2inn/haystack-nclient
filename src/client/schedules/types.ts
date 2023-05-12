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
import { AtLeastOne } from '../../util/types'

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
export interface ScheduleObj extends HDict {
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
	 * The required schedule marker tag
	 */
	schedule: HMarker

	/**
	 * The required point marker tag
	 */
	point: HMarker

	/**
	 * Is the current value of the schedule.
	 */
	curVal?: OptionalHVal

	/**
	 * Is the schedule kind (bool, number, str).
	 * Must be capitalized. e.g. 'Str', 'Bool'
	 */
	kind: Capitalize<Kind>

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
	 * Is the range of dates that the schedule is active.
	 */
	effectivePeriod: { effectivePeriod: HMarker } & CalendarRange

	/**
	 * The list of one week of schedules.
	 */
	weeklySchedule?: HList<WeekDaySchedule>

	/**
	 * The list of scheduled exceptions.
	 */
	exceptionSchedule: ExceptionSchedule
}

/**
 * The Schedule object with additional rules.
 * Must have at least one property: 'exceptionSchedule' | 'weeklySchedule'
 */
export type Schedule = AtLeastOne<
	ScheduleObj,
	'exceptionSchedule' | 'weeklySchedule'
>

/**
 * Defines the day of week and schedule for that day.
 */
export interface WeekDaySchedule extends HDict {
	dayToSchedule: HMarker
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
	specialEvent: HMarker
	calendarEntry?: CalendarEntry
	calendarRef?: HRef
	priority: number
	dailySchedule: HList<DailySchedule>
}

/**
 * Defines data for the bacnet time object.
 */
export interface BacnetTime extends HDict {
	bacnetTime: HMarker
	hour?: number
	minute?: number
	second?: number
	hundredths?: number
}

/**
 * Defines the schedule for a day.
 */
export interface DailySchedule extends HDict {
	timeToVal: HMarker
	bacnetTime: BacnetTime
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
	dis: HStr

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
	entries?: HList<CalendarEntry>
}

/**
 * A Calendar Entry.
 */
export type CalendarEntry = { calendarEntry: HMarker } & (
	| CalendarDate
	| CalendarRange
	| CalendarWeekNDay
)

/**
 * A Date for a Calendar.
 */
export interface CalendarDate extends HDict {
	entryType: 'Date'
	year?: number
	month?: number
	dayOfMonth?: number
	dayOfWeek?: number
}

/**
 * The Date range of a Calendar.
 */
export interface CalendarRange extends HDict {
	entryType: 'Range'
	lowBound?: HDate
	upBound?: HDate
}

/**
 * Define the week and day of a Calendar.
 */
export interface CalendarWeekNDay extends HDict {
	entryType: 'WeekNDay'
	weekOfMonth?: number
	month?: number
	dayOfWeek?: number
}
