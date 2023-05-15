/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import {
	HAYSON_MIME_TYPE,
	HDate,
	HDict,
	HGrid,
	HList,
	HMarker,
	HRef,
	HStr,
	Kind,
} from 'haystack-core'
import fetchMock from 'fetch-mock'
import { clearFinCsrfTokens } from '../../../src/client/finCsrfFetch'
import { ScheduleService } from '../../../src/client/schedules/ScheduleService'
import { Client } from '../../../src/client/Client'
import {
	Calendar,
	SchedulablePoint,
	Schedule,
	ScheduleServiceEndpoints,
	getHaystackServiceUrl,
} from '../../../src'

const mockSchedule = () => {
	return new HDict({
		schedule: HMarker.make(),
		point: HMarker.make(),
		dis: 'Schedule record',
		tz: 'Mexico_City',
		// Kind name starts with uppercase as in defs.
		kind: 'Str',
		effectivePeriod: new HDict({
			effectivePeriod: HMarker.make(),
			entryType: 'Range',
			lowBound: HDate.make('1998-12-01'),
			upBound: HDate.make('1998-12-15'),
		}),
		weeklySchedule: new HList(
			new HDict({
				dayToSchedule: HMarker.make(),
				dayOfWeek: 4,
				dailySchedule: new HList(
					new HDict({
						timeToVal: HMarker.make(),
						bacnetTime: new HDict({
							bacnetTime: HMarker.make(),
							hour: 2,
							minute: 28,
							second: 41,
						}),
						scheduledVal: 'boo',
					})
				),
			})
		),
		exceptionSchedule: new HList(
			new HDict({
				specialEvent: HMarker.make(),
				priority: 15,
				dailySchedule: new HList(
					new HDict({
						timeToVal: HMarker.make(),
						bacnetTime: new HDict({
							bacnetTime: HMarker.make(),
							hour: 14,
							second: 0,
						}),
						scheduledVal: 'bar',
					})
				),
				calendarEntry: new HDict({
					calendarEntry: HMarker.make(),
					entryType: 'Date',
					dayOfMonth: 21,
					dayOfWeek: 4,
				}),
			})
		),
	}) as Schedule
}

const mockPoint = (): SchedulablePoint => {
	return new HDict({
		id: HRef.make('p9089'),
		dis: HStr.make('s-point'),
		kind: Kind.Bool,
		point: HMarker.make(),
		schedulable: 12,
		scheduleHRef: HRef.make('123'),
	}) as SchedulablePoint
}

const mockCalendar = (): Calendar => {
	return new HDict({
		id: HRef.make('c123'),
		dis: HStr.make('Cal-01'),
		calendar: HMarker.make(),
		entries: HList.make([
			new HDict({
				entryType: 'WeekNDay',
				nthWeek: 1,
				dayOfWeek: 2,
			}),
		]),
	}) as Calendar
}

describe('ScheduleService', () => {
	let resp: HDict | HGrid | HRef
	let service: ScheduleService

	const baseUrl = 'http://localhost:8080'

	function prepareMock(
		verb: string,
		endpoint: ScheduleServiceEndpoints | string,
		resp: HDict | HGrid
	): void {
		fetchMock.reset().mock(
			`begin:${getHaystackServiceUrl({
				origin: baseUrl,
				pathPrefix: '',
				project: 'demo',
				path: endpoint,
			})}`,
			{
				body: resp.toJSON(),
				headers: { 'content-type': HAYSON_MIME_TYPE },
			},
			{ method: verb }
		)

		service = new ScheduleService(
			new Client({ base: new URL(baseUrl), project: 'demo', fetch })
		)
	}

	beforeEach(function (): void {
		clearFinCsrfTokens()
	})

	const getUrl = (path: string): string =>
		`${getHaystackServiceUrl({
			origin: baseUrl,
			pathPrefix: '',
			project: 'demo',
			path,
		})}`

	// ********************************
	// Start Schedule Endpoint Testing
	// ********************************

	describe('#readAllSchedules()', () => {
		beforeEach((): void => {
			resp = HGrid.make(mockSchedule())
			prepareMock('GET', ScheduleServiceEndpoints.Schedules, resp)
		})

		it('fetches the schedule with no params/options', async () => {
			await service.readAllSchedules()
			expect(fetchMock.lastUrl()).toEqual(
				getUrl(ScheduleServiceEndpoints.Schedules)
			)
		})

		it('fetches the schedules based on a filter', async () => {
			await service.readAllSchedules({ filter: 'dis=="sample"' })

			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(
					ScheduleServiceEndpoints.Schedules
				)}?filter=${encodeURIComponent('dis=="sample"')}`
			)
		})

		it('fetches the schedules and limits them to 1 item', async () => {
			await service.readAllSchedules({ limit: 1 })
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Schedules)}?limit=1`
			)
		})

		it('fetches the schedules and asks for only some columns/props specified', async () => {
			await service.readAllSchedules({ columns: ['dis', 'mod'] })
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(
					ScheduleServiceEndpoints.Schedules
				)}?columns=${encodeURI('dis|mod')}`
			)
		})

		it('fetches the schedule and sorts the result by some column names', async () => {
			await service.readAllSchedules({ sort: ['dis', 'mod'] })
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Schedules)}?sort=${encodeURI(
					'dis|mod'
				)}`
			)
		})

		it('fetches the schedules with all query params', async () => {
			await service.readAllSchedules({
				columns: ['dis', 'mod'],
				limit: 2,
				sort: ['dis', 'id'],
				filter: 'events < 5',
			})

			const expected = `columns=${encodeURI(
				'dis|mod'
			)}&limit=2&sort=${encodeURI('dis|id')}&filter=${encodeURIComponent(
				'events < 5'
			)}`

			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Schedules)}?${expected}`
			)
		})
	})

	describe('#createSchedules()', () => {
		beforeEach(() => {
			resp = HGrid.make(mockSchedule())
			prepareMock('POST', ScheduleServiceEndpoints.Schedules, resp)
		})

		it('creates a single schedule', async () => {
			const payload = mockSchedule()
			payload.remove('id')
			payload.remove('schedule')

			// API always returns HGrid
			const response = HGrid.make(payload)

			await service.createSchedules(payload)
			expect(
				fetchMock.lastCall(
					getUrl(ScheduleServiceEndpoints.Schedules)
				)?.[1]?.body
			).toEqual(JSON.stringify(response.toJSON()))
		})

		it('creates multiple schedules', async () => {
			const d1 = mockSchedule()
			d1.remove('id')
			d1.remove('schedule')

			const d2 = HDict.make(d1) as Schedule
			const payload = HGrid.make([d1, d2])

			await service.createSchedules(payload)
			expect(
				fetchMock.lastCall(
					getUrl(ScheduleServiceEndpoints.Schedules)
				)?.[1]?.body
			).toEqual(JSON.stringify(payload.toJSON()))
		})
	})

	describe('#readScheduleById()', () => {
		beforeEach(() => {
			resp = mockSchedule()
			prepareMock(
				'GET',
				`${ScheduleServiceEndpoints.Schedules}/123`,
				resp
			)
		})

		it('reads a particular schedule by string id', async () => {
			await service.readScheduleById('123')
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Schedules)}/123`
			)
		})

		it('reads a particular schedule by HRef', async () => {
			await service.readScheduleById(HRef.make('123'))
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Schedules)}/123`
			)
		})
	})

	describe('#updateSchedule()', () => {
		beforeEach(() => {
			resp = mockSchedule()
			prepareMock(
				'PATCH',
				`${ScheduleServiceEndpoints.Schedules}/123`,
				resp
			)
		})

		it('updates a schedule specified by an id', async () => {
			const schedule = mockSchedule()

			await service.updateSchedule('123', schedule)
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Schedules)}/123`
			)
			expect(
				fetchMock.lastCall(
					`${getUrl(ScheduleServiceEndpoints.Schedules)}/123`
				)?.[1]?.body
			).toEqual(JSON.stringify(schedule.toJSON()))
		})
	})

	describe('#deleteScheduleById()', () => {
		beforeEach(() => {
			resp = mockSchedule()
			prepareMock(
				'DELETE',
				`${ScheduleServiceEndpoints.Schedules}/123`,
				resp
			)
		})

		it('deletes a particular schedule by string id', async () => {
			await service.deleteScheduleById('123')
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Schedules)}/123`
			)
		})

		it('deletes a particular schedule by HRef', async () => {
			await service.deleteScheduleById(HRef.make('123'))
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Schedules)}/123`
			)
		})
	})

	describe('#readScheduleCalendarsById()', () => {
		beforeEach(() => {
			resp = HGrid.make(mockCalendar())
			prepareMock(
				'get',
				`${ScheduleServiceEndpoints.Schedules}/123/calendars`,
				resp
			)
		})

		it('gets the events for schedule id specified as string', async () => {
			await service.readScheduleCalendarsById('123')
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Schedules)}/123/calendars`
			)
		})

		it('gets the events for schedule id specified as HRef', async () => {
			await service.readScheduleCalendarsById(HRef.make('123'))
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Schedules)}/123/calendars`
			)
		})
	})

	// ***************************************
	// Start Schedule/Points Endpoint Testing
	// ***************************************

	describe('#readSchedulablePoints()', () => {
		beforeEach(() => {
			resp = HGrid.make(mockPoint())
			prepareMock(
				'GET',
				`${ScheduleServiceEndpoints.Schedules}/123/points`,
				resp
			)
		})

		it('gets the points for schedule id specified as string', async () => {
			await service.readSchedulablePoints('123')
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Schedules)}/123/points`
			)
		})

		it('gets the points for schedule id specified as HRef', async () => {
			await service.readSchedulablePoints(HRef.make('123'))
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Schedules)}/123/points`
			)
		})

		it('fetches the schedulable points based on a filter', async () => {
			await service.readSchedulablePoints('123', {
				filter: 'dis=="sample"',
			})

			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(
					ScheduleServiceEndpoints.Schedules
				)}/123/points?filter=${encodeURIComponent('dis=="sample"')}`
			)
		})

		it('fetches the schedulable points and limits them to 1 item', async () => {
			await service.readSchedulablePoints('123', { limit: 1 })
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(
					ScheduleServiceEndpoints.Schedules
				)}/123/points?limit=1`
			)
		})

		it('fetches the scheduluable points and asks for only some columns/props specified', async () => {
			await service.readSchedulablePoints('123', {
				columns: ['dis', 'mod'],
			})
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(
					ScheduleServiceEndpoints.Schedules
				)}/123/points?columns=${encodeURI('dis|mod')}`
			)
		})

		it('fetches the scheduluable points and sorts the result by some column names', async () => {
			await service.readSchedulablePoints('123', { sort: ['dis', 'mod'] })
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(
					ScheduleServiceEndpoints.Schedules
				)}/123/points?sort=${encodeURI('dis|mod')}`
			)
		})

		it('fetches the scheduluable points with all query params', async () => {
			await service.readSchedulablePoints('123', {
				columns: ['dis', 'mod'],
				limit: 2,
				sort: ['dis', 'id'],
				filter: 'events < 5',
			})

			const expected = `columns=${encodeURI(
				'dis|mod'
			)}&limit=2&sort=${encodeURI('dis|id')}&filter=${encodeURIComponent(
				'events < 5'
			)}`

			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(
					ScheduleServiceEndpoints.Schedules
				)}/123/points?${expected}`
			)
		})
	})

	describe('#updateSchedulePoints()', () => {
		beforeEach(() => {
			resp = HGrid.make(mockPoint())
			prepareMock(
				'PATCH',
				`${ScheduleServiceEndpoints.Schedules}/123/points`,
				resp
			)
		})

		it('adds points to a schedule specified by string id', async () => {
			const payload = { add: HList.make([HRef.make('345')]) }

			await service.updateSchedulePoints('123', payload)
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Schedules)}/123/points`
			)

			const expected = HDict.make({
				add: HList.make([HRef.make('345')]),
			})
			expect(
				fetchMock.lastCall(
					`${getUrl(ScheduleServiceEndpoints.Schedules)}/123/points`
				)?.[1]?.body
			).toEqual(JSON.stringify(expected.toJSON()))
		})

		it('adds points to a schedule specfied by HRef id', async () => {
			const payload = { add: HList.make([HRef.make('345')]) }

			await service.updateSchedulePoints(HRef.make('123'), payload)
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Schedules)}/123/points`
			)

			const expected = HDict.make({
				add: HList.make([HRef.make('345')]),
			})
			expect(
				fetchMock.lastCall(
					`${getUrl(ScheduleServiceEndpoints.Schedules)}/123/points`
				)?.[1]?.body
			).toEqual(JSON.stringify(expected.toJSON()))
		})

		it('removes points from a schedule', async () => {
			const payload = { remove: HList.make([HRef.make('345')]) }

			await service.updateSchedulePoints('123', payload)
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Schedules)}/123/points`
			)

			const expected = HDict.make({
				remove: HList.make([HRef.make('345')]),
			})
			expect(
				fetchMock.lastCall(
					`${getUrl(ScheduleServiceEndpoints.Schedules)}/123/points`
				)?.[1]?.body
			).toEqual(JSON.stringify(expected.toJSON()))
		})

		it('adds and removes the points from the schedule', async () => {
			const payload = {
				add: HList.make([HRef.make('abc')]),
				remove: HList.make([HRef.make('345')]),
			}

			await service.updateSchedulePoints('123', payload)
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Schedules)}/123/points`
			)

			const expected = HDict.make({
				add: HList.make([HRef.make('abc')]),
				remove: HList.make([HRef.make('345')]),
			})
			expect(
				fetchMock.lastCall(
					`${getUrl(ScheduleServiceEndpoints.Schedules)}/123/points`
				)?.[1]?.body
			).toEqual(JSON.stringify(expected.toJSON()))
		})
	})

	// ***********************
	// Start Calendar Testing
	// ***********************

	describe('#readAllCalendars()', () => {
		beforeEach((): void => {
			resp = HGrid.make(mockCalendar())
			prepareMock('GET', ScheduleServiceEndpoints.Calendars, resp)
		})

		it('fetches the calendars with no params/options', async () => {
			await service.readAllCalendars()
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Calendars)}`
			)
		})

		it('fetches the calendars based on a filter', async () => {
			await service.readAllCalendars({ filter: 'dis=="sample"' })
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(
					ScheduleServiceEndpoints.Calendars
				)}?filter=${encodeURIComponent('dis=="sample"')}`
			)
		})

		it('fetches the calendars and limits them to 1 item', async () => {
			await service.readAllCalendars({ limit: 1 })
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Calendars)}?limit=1`
			)
		})

		it('fetches the calendars and asks for only some columns/props specified', async () => {
			await service.readAllCalendars({
				columns: ['dis', 'mod'],
			})
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(
					ScheduleServiceEndpoints.Calendars
				)}?columns=${encodeURI('dis|mod')}`
			)
		})

		it('fetches the calendars and sorts the result by some column names', async () => {
			await service.readAllCalendars({
				sort: ['dis', 'mod'],
			})
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Calendars)}?sort=${encodeURI(
					'dis|mod'
				)}`
			)
		})

		it('fetches the calendars with all query params', async () => {
			await service.readAllCalendars({
				columns: ['dis', 'mod'],
				limit: 2,
				sort: ['dis', 'id'],
				filter: 'area > 20',
			})

			const expected = `columns=${encodeURI(
				'dis|mod'
			)}&limit=2&sort=${encodeURI('dis|id')}&filter=${encodeURIComponent(
				'area > 20'
			)}`

			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Calendars)}?${expected}`
			)
		})
	})

	describe('#createCalendars()', () => {
		beforeEach(() => {
			resp = HGrid.make(mockCalendar())
			prepareMock('POST', ScheduleServiceEndpoints.Calendars, resp)
		})

		it('creates a single calendar', async () => {
			const payload = mockCalendar()
			payload.remove('id')

			const response = HGrid.make(payload)

			await service.createCalendars(payload)
			expect(
				fetchMock.lastCall(
					getUrl(ScheduleServiceEndpoints.Calendars)
				)?.[1]?.body
			).toEqual(JSON.stringify(response.toJSON()))
		})

		it('creates multiple calendars', async () => {
			const d1 = mockCalendar()
			d1.remove('id')

			const d2 = HDict.make(d1) as Calendar
			const payload = HGrid.make([d1, d2])

			await service.createCalendars(payload)
			expect(
				fetchMock.lastCall(
					getUrl(ScheduleServiceEndpoints.Calendars)
				)?.[1]?.body
			).toEqual(JSON.stringify(payload.toJSON()))
		})
	})

	describe('#readCalendarById()', () => {
		beforeEach(() => {
			resp = mockCalendar()
			prepareMock(
				'GET',
				`${ScheduleServiceEndpoints.Calendars}/123`,
				resp
			)
		})

		it('reads a particular calendar by string id', async () => {
			await service.readCalendarById('123')
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Calendars)}/123`
			)
		})

		it('reads a particular calendar by HRef', async () => {
			await service.readCalendarById(HRef.make('123'))
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Calendars)}/123`
			)
		})
	})

	describe('#updateCalendar()', () => {
		beforeEach(() => {
			resp = mockCalendar()
			prepareMock(
				'PATCH',
				`${ScheduleServiceEndpoints.Calendars}/c123`,
				resp
			)
		})

		it('updates a calendar specified by id', async () => {
			const calendar = mockCalendar()

			await service.updateCalendar('c123', calendar)
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Calendars)}/c123`
			)
			expect(
				fetchMock.lastCall(
					`${getUrl(ScheduleServiceEndpoints.Calendars)}/c123`
				)?.[1]?.body
			).toEqual(JSON.stringify(calendar.toJSON()))
		})
	})

	describe('#deleteCalendarById()', () => {
		beforeEach(() => {
			resp = mockCalendar()
			prepareMock(
				'DELETE',
				`${ScheduleServiceEndpoints.Calendars}/c123`,
				resp
			)
		})

		it('deletes a particular calendar by string id', async () => {
			await service.deleteCalendarById('c123')
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Calendars)}/c123`
			)
		})

		it('deletes a particular calendar identified by HRef id', async () => {
			await service.deleteCalendarById(HRef.make('c123'))
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Calendars)}/c123`
			)
		})
	})

	describe('#readCalendarSchedulesById()', () => {
		beforeEach(() => {
			resp = HGrid.make(mockSchedule())
			prepareMock(
				'GET',
				`${ScheduleServiceEndpoints.Calendars}/c123`,
				resp
			)
		})

		it('returns all the schedules for a calendar identified by string id', async () => {
			await service.readCalendarSchedulesById('c123')
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Calendars)}/c123/schedules`
			)
		})

		it('returns all the schedules for a calendar identified by HRef id', async () => {
			await service.readCalendarSchedulesById(HRef.make('c123'))
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(ScheduleServiceEndpoints.Calendars)}/c123/schedules`
			)
		})
	})
})
