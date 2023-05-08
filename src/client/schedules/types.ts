/*
 * Copyright (c) 2020-2023, J2 Innovations. All Rights Reserved
 */

import {
	HBool,
	HDate,
	HDateTime,
	HDict,
	HList,
	HNum,
	HRef,
	HStr,
	HTime,
	HVal,
	Kind,
} from 'haystack-core'

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
 * Interface for adding and/or removing schedulable points
 */
export interface SchedulePointUpdate {
	add?: HRef[]
	remove?: HRef[]
}

/**
 * The schedule range object
 */
export interface ScheduleRange extends HDict {
	/**
	 * Specifies the date when the schedule starts to be active. If not specified, is/was
	 * always active
	 */
	lowBound?: HDate

	/**
	 * Specifies the date when the schedule ceases to be active. IF not specifies will
	 * start active forever
	 */
	upBound?: HDate
}

/**
 * Specifies the pattern for a date end point for an event.
 */
export interface DatePatternEndPoint extends HDict {
	/**
	 * Specifies the year of the event. If not set, it occur any/every year
	 */
	year?: HNum

	/**
	 * Specifies the month of the event. If not specified, it occurs every/any month.
	 * Range [1..12] => [Jan..Dec]
	 */
	month?: HNum

	/**
	 * Specifies the date of the event occurance in a month
	 * Range [1..31]
	 */
	date: HNum
}

/**
 * The schedule event/calendar entry date-rule
 */
export interface SchedulePeriodDateRuleType extends HDict {
	/**
	 * Specifies the nth week of a month with some special cases.
	 * - **positive(> 0)** values specify the nth week from the start of the month with the max value of 5
	 * - **negative(< 0)** values specify the nth week from the end of the month (eg: -2 = 2nd last week)
	 * - the value of **0** means any/all the weeks
	 */
	nthWeek: HNum

	/**
	 * Specifies the nth day on the week with special cases
	 * - values **1..7** state the days **sun..sat**
	 * - value of **0** means **all/any** day of the week
	 */
	nthDay: HNum

	/**
	 * Specifies the nth month in a year for the event, with some special cases.
	 * - values **1..12** represent normal months, **jan..dec**
	 * - value **13** means all **odd** months starting with jan
	 * - value of **14** means all **even** months starting with feb
	 * - and the value of **0** mean any/all months
	 */
	nthMonth: HNum
}

/**
 * Specifies the day of the weeks with 1 = sun and 7 = sat
 */
export type SchedulePeriodWeekdays = HList<HNum>

/**
 * Specifies the event/entry date range pattern
 */
export interface SchedulePeriodDateRangePatternType extends HDict {
	/**
	 * Specifies the start of the event/entry
	 */
	start: DatePatternEndPoint

	/**
	 * Specifies the end of the event/entry (if any)
	 */
	end?: DatePatternEndPoint
}

/**
 * Specifies the date-range of a schedule/calendar event/entry
 */
export interface SchedulePeriodDateRangeType extends HDict {
	/**
	 * Is the start date of the event/entry
	 */
	start: HDate

	/**
	 * Is the end date of the event/entry
	 */
	end: HDate
}

/**
 * Specifies the schedule/calendar event/entry period
 */
export interface SchedulePeriod extends HDict {
	/**
	 * Indetifies the type of period value for the event/entry. The value of this
	 * can be one of [date, dateRange, datePattern, dateRangePattern, dateRule, weekdays]
	 */
	type: HStr

	/**
	 * Specifies the value of the event/entry period
	 */
	val:
		| HDate /* when type = date */
		| SchedulePeriodDateRangeType /* when type = dateRange */
		| SchedulePeriodDateRangePatternType /* when type = dateRangePattern */
		| DatePatternEndPoint /* when type = datePattern */
		| SchedulePeriodDateRuleType /* when type = dateRule */
		| SchedulePeriodWeekdays /* when type = weekdays */
}

/**
 * A list of daily schedules for a week.
 */
export type WeeklySchedule = WeekDaySchedule[]

/**
 * Defines the day of week and schedule for that day.
 */
export interface WeekDaySchedule extends HDict {
	dayOfWeek: HNum,
	dailySchedule: DailySchedule
}

/**
 * Defines the schedule for a day.
 */
export interface DailySchedule extends HDict {
	bacnetTime: {
		hour: HNum
		minute: HNum
		second: HNum
		hundredths: HNum
	}
	scheduledVal: HVal
}

export type ExceptionSchedules = ExeceptionSchedule[]

export interface ExeceptionSchedule extends HDict {

}

/**
 * Is the calendar entry object
 */
export interface CalendarEntry extends HDict {
	/**
	 * Specifies the name/value for the calendar entry
	 */
	val?: HStr

	/**
	 * Is the id of the calendar to which this entry belongs (in case of extended calendars)
	 */
	calendar?: HRef

	/**
	 * Specifies the period of the entry
	 */
	period: SchedulePeriod
}

/**
 * Is the schedule event
 */
export interface ScheduleEvent extends HDict {
	/**
	 * Is the display name/label for the event
	 */
	dis?: HStr

	/**
	 * Specifies the event type. Can be one on ['exception', 'weekly']
	 */
	type: HStr

	/**
	 * Specifies the start time of the event in a day
	 */
	start: HTime

	/**
	 * Specifies the end time of the event in a day
	 */
	end: HTime

	/**
	 * Specifies the value of the calendar (if this event is being delievered from a calendar and if there is a calendar value)
	 */
	calValue: HStr

	/**
	 * Is the value of the event. Is the value which will be applied to all the points that are being
	 * scheduled via this schedule during the times when this event is active
	 */
	val: HStr | HBool | HNum

	/**
	 * Specifies the event priority. This helps determine event precidence when various/multiple events
	 * compete for the same time/date slot. Value range is 0..16. The higher the value, lower the priority.
	 */
	priority: HNum

	/**
	 * The status of the event (if any)
	 */
	status?: HStr

	/**
	 * Is the calendar id for the event, if the event is provided by a calendar
	 */
	calendar?: HRef

	/**
	 * Specifies the error (if any) associated with the event
	 */
	err?: HStr

	/**
	 * Specifies the period of the event. This determines the date value of the event in a year (or over multiple years)
	 */
	period?: SchedulePeriod
}

/**
 * Schedule object
 */
export interface Schedule extends HDict {
	/**
	 * Is the id of the scehdule object
	 */
	id: HRef

	/**
	 * Specifies the name of the schedule
	 */
	dis: HStr

	/**
	 * Is the schedule kind (bool, number, str)
	 */
	kind: Kind

	/**
	 * Is the range of dates (if any) that the schedule is active
	 */
	effectivePeriod: ScheduleRange

	/**
	 * Is the current value of the schedule
	 */
	curVal?: HVal

	/**
	 * Is the list of calendar(s) the schedule subscribes to
	 */
	calendarRefs?: HList<HRef>

	/**
	 * Specifies the default value of the schedule (if any)
	 */
	defaultVal?: HVal
	/**
	 * Is the next value of the schedule (whenever it changes)
	 */
	nextVal?: HVal

	/**
	 * Specifies the date-time when the value of schedule will update next
	 */
	nextTime?: HDateTime

	/**
	 * Is the date/time value when the schedule was modified last
	 */
	mod?: HDateTime

	/**
	 * One week of schedules per day
	 */
	weeklySchedule?: WeeklySchedule

	exceptionSchedule?: 
}

/**
 * The Calendar object
 */
export interface Calendar extends HDict {
	/**
	 * Specifies the id of the calendar
	 */
	id: HRef

	/**
	 * Is the date-time when the calendar was last modified
	 */
	mod: HDateTime

	/**
	 * Specifies the display name/label of the calendar
	 */
	dis: HStr

	/**
	 * Specifies the value of the calendar object (if any)
	 */
	val?: HStr

	/**
	 * Specifies the parent calendar object (if any)
	 */
	extends?: HRef

	/**
	 * Specifies the list of all the entries that the calendar is active
	 */
	entries: HList<CalendarEntry>
}

/**
 * Object defining the schedule point
 */
export interface SchedulePoint extends HDict {
	/**
	 * Is the id of the point
	 */
	id: HRef

	/**
	 * Is the number specifying to what priority on the point should the
	 * schedule be writing on. Range 1-15
	 */
	schedulable: HNum

	/**
	 * Is the schedule that is writing to the point
	 */
	scheduleRef: HRef
}
