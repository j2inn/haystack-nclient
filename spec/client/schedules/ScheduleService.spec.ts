/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import {
	date,
	dateTime,
	dict,
	HAYSON_MIME_TYPE,
	HDict,
	HGrid,
	Kind,
	list,
	MARKER,
	num,
	ref,
	str,
	time,
} from 'haystack-core'
import fetchMock from 'fetch-mock'
import { clearFinCsrfTokens } from '../../../src/client/finCsrfFetch'
import {
	ScheduleService,
	Schedule_Serv_EndPoints,
	ScheduleMessages,
} from '../../../src/client/schedules/ScheduleService'
import { Client } from '../../../src/client/Client'

describe('ScheduleService', () => {
	const SampleScheduleObj = () => {
		return dict({
			schedule: MARKER,
			id: ref('123'),
			dis: str('sample'),
			mod: dateTime(new Date()),
			kind: str(Kind.Number),
			curVal: num(20),
			nextVal: num(30),
			nextChange: dateTime(new Date()),
		})
	}

	const SampleEvent = () => {
		return dict({
			dis: str('event 01'),
			type: str('exception'),
			start: time('08:30:00'),
			end: time('15:30:00'),
			val: num(20),
			priority: num(5),
			status: str('ok'),
			period: dict({
				type: str('date'),
				val: date('2020-10-23'),
			}),
		})
	}

	const SamplePoint = () => {
		return dict({
			id: ref('p9089'),
			schedulable: num(12),
			scheduleRef: ref('123'),
		})
	}

	const SampleCalendar = () => {
		return dict({
			id: ref('c123'),
			dis: str('Cal-01'),
			mod: dateTime(new Date()),
			entries: list([
				dict({
					val: num(10),
					period: dict({
						type: str('date'),
						val: date('2020-10-23'),
					}),
				}),
			]),
		})
	}

	let resp: HDict | HGrid
	let service: ScheduleService

	const baseUrl = 'http://localhost:8080'
	const ABS_DEFS_PATH = `${baseUrl}/api/sys/eval`

	function prepareFetch(): void {
		const grid = HGrid.make({ rows: [{ foo: true }] })

		fetchMock.reset().post(ABS_DEFS_PATH, grid.toZinc())

		service = new ScheduleService(
			new Client({ base: new URL(baseUrl), fetch })
		)
	}

	function prepareMock(
		verb: string,
		endpoint: string,
		resp: HDict | HGrid
	): void {
		fetchMock.mock(
			`begin:${baseUrl}/api/haystack/demo/${endpoint}`,
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
		prepareFetch()
	})

	function getUrl(path: string): string {
		return `${baseUrl}/api/haystack/demo/${path}`
	}

	describe('#readSchedules()', () => {
		beforeEach((): void => {
			resp = HGrid.make(SampleScheduleObj())
			prepareMock('get', Schedule_Serv_EndPoints.Schedules, resp)
		})

		it('fetches the schedule with no params/options', async () => {
			await service.readSchedules()
			expect(fetchMock.lastUrl()).toEqual(
				getUrl(Schedule_Serv_EndPoints.Schedules)
			)
		})

		it('fetches the schedules based on a filter', async () => {
			await service.readSchedules({ filter: 'dis=="sample"' })
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(
					Schedule_Serv_EndPoints.Schedules
				)}?filter=${encodeURIComponent('dis=="sample"')}`
			)
		})

		it('fetches the schedules and limits them to 1 item', async () => {
			await service.readSchedules({ options: { limit: 1 } })
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Schedules)}?limit=1`
			)
		})

		it('fetches the schedules and asks for only some columns/props specified', async () => {
			await service.readSchedules({
				options: { columns: ['dis', 'mod'] },
			})
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(
					Schedule_Serv_EndPoints.Schedules
				)}?columns=${encodeURI('dis|mod')}`
			)
		})

		it('fetches the schedule and sorts the result by some column names', async () => {
			await service.readSchedules({
				options: { sort: ['dis', 'mod'] },
			})
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Schedules)}?sort=${encodeURI(
					'dis|mod'
				)}`
			)
		})

		it('fetches the schedules with all query params', async () => {
			await service.readSchedules({
				filter: 'events < 5',
				options: {
					columns: ['dis', 'mod'],
					limit: 2,
					sort: ['dis', 'id'],
				},
			})

			const expected = `columns=${encodeURI(
				'dis|mod'
			)}&limit=2&sort=${encodeURI('dis|id')}&filter=${encodeURIComponent(
				'events < 5'
			)}`

			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Schedules)}?${expected}`
			)
		})
	})

	describe('#createSchedule()', () => {
		beforeEach(() => {
			resp = HGrid.make(SampleScheduleObj())
			prepareMock('post', Schedule_Serv_EndPoints.Schedules, resp)
		})

		it('creates a single schedule', async () => {
			const payload = SampleScheduleObj()
			payload.remove('id')
			payload.remove('schedule')
			payload.remove('mod')

			await service.createSchedules(payload)
			expect(
				fetchMock.lastCall(
					getUrl(Schedule_Serv_EndPoints.Schedules)
				)?.[1]?.body
			).toEqual(JSON.stringify(payload.toJSON()))
		})

		it('creates multiple schedules', async () => {
			const d1 = SampleScheduleObj()
			d1.remove('id')
			d1.remove('schedule')
			d1.remove('mod')

			const d2 = HDict.make(d1)
			const payload = HGrid.make([d1, d2])

			await service.createSchedules(payload)
			expect(
				fetchMock.lastCall(
					getUrl(Schedule_Serv_EndPoints.Schedules)
				)?.[1]?.body
			).toEqual(JSON.stringify(payload.toJSON()))
		})
	})

	describe('#readScheduleById()', () => {
		beforeEach(() => {
			resp = HGrid.make(SampleScheduleObj())
			prepareMock(
				'get',
				Schedule_Serv_EndPoints.Schedule.replace(':id', '123'),
				resp
			)
		})

		it('reads a particular schedule by string id', async () => {
			await service.readScheduleById('123')
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Schedule).replace(
					':id',
					'123'
				)}`
			)
		})

		it('reads a particular schedule by ref', async () => {
			await service.readScheduleById(ref('123'))
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Schedule).replace(
					':id',
					'123'
				)}`
			)
		})
	})

	describe('#updateSchedule()', () => {
		beforeEach(() => {
			resp = HGrid.make(SampleScheduleObj())
			prepareMock(
				'patch',
				Schedule_Serv_EndPoints.Schedule.replace(':id', '123'),
				resp
			)
		})

		it('updates a schedule specified by an id', async () => {
			const sch = SampleScheduleObj()

			await service.updateSchedule(sch)
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Schedule).replace(
					':id',
					'123'
				)}`
			)
			expect(
				fetchMock.lastCall(
					getUrl(Schedule_Serv_EndPoints.Schedule).replace(
						':id',
						'123'
					)
				)?.[1]?.body
			).toEqual(JSON.stringify(sch.toJSON()))
		})

		it('throws error if the rec does not have an id', async () => {
			const sch = SampleScheduleObj()
			sch.remove('id')

			expect(service.updateSchedule(sch)).rejects.toEqual(
				new Error(ScheduleMessages.BadRequest)
			)
		})
	})

	describe('#deleteSchedule()', () => {
		beforeEach(() => {
			resp = HGrid.make(SampleScheduleObj())
			prepareMock(
				'delete',
				Schedule_Serv_EndPoints.Schedule.replace(':id', '123'),
				resp
			)
		})

		it('deletes a particular schedule by string id', async () => {
			await service.deleteSchedule('123')
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Schedule).replace(
					':id',
					'123'
				)}`
			)
		})

		it('deletes a particular schedule by ref', async () => {
			await service.deleteSchedule(ref('123'))
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Schedule).replace(
					':id',
					'123'
				)}`
			)
		})
	})

	describe('#readScheduleEvents()', () => {
		beforeEach(() => {
			resp = HGrid.make(SampleEvent())
			prepareMock(
				'get',
				Schedule_Serv_EndPoints.Events.replace(':id', '123'),
				resp
			)
		})

		it('gets the events for schedule id specified as string', async () => {
			await service.readScheduleEvents('123')
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Events).replace(
					':id',
					'123'
				)}`
			)
		})

		it('gets the events for schedule id specified as ref', async () => {
			await service.readScheduleEvents(ref('123'))
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Events).replace(
					':id',
					'123'
				)}`
			)
		})
	})

	describe('#updateScheduleEvents()', () => {
		beforeEach(() => {
			resp = HGrid.make(SampleEvent())
			prepareMock(
				'patch',
				Schedule_Serv_EndPoints.Events.replace(':id', '123'),
				resp
			)
		})

		it('updates the events for schedule id specified as string', async () => {
			const payload = HGrid.make(SampleEvent())
			await service.updateScheduleEvents('123', payload)
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Events).replace(
					':id',
					'123'
				)}`
			)
			expect(
				fetchMock.lastCall(
					`${getUrl(Schedule_Serv_EndPoints.Events).replace(
						':id',
						'123'
					)}`
				)?.[1]?.body
			).toEqual(JSON.stringify(payload.toJSON()))
		})

		it('gets the events for schedule id specified as ref', async () => {
			const payload = HGrid.make(SampleEvent())
			await service.updateScheduleEvents('123', payload)
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Events).replace(
					':id',
					'123'
				)}`
			)
			expect(
				fetchMock.lastCall(
					`${getUrl(Schedule_Serv_EndPoints.Events).replace(
						':id',
						'123'
					)}`
				)?.[1]?.body
			).toEqual(JSON.stringify(payload.toJSON()))
		})
	})

	describe('#readSchedulePoints()', () => {
		beforeEach(() => {
			resp = HGrid.make(SamplePoint())
			prepareMock(
				'get',
				Schedule_Serv_EndPoints.Points.replace(':id', '123'),
				resp
			)
		})

		it('gets the points for schedule id specified as string', async () => {
			await service.readSchedulePoints('123')
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Points).replace(
					':id',
					'123'
				)}`
			)
		})

		it('gets the points for schedule id specified as ref', async () => {
			await service.readSchedulePoints(ref('123'))
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Points).replace(
					':id',
					'123'
				)}`
			)
		})
	})

	describe('#updateSchedulePoints()', () => {
		beforeEach(() => {
			resp = HGrid.make(SamplePoint())
			prepareMock(
				'patch',
				Schedule_Serv_EndPoints.Points.replace(':id', '123'),
				resp
			)
		})

		it('adds points to a schedule specfied my string id', async () => {
			const payload = { add: [ref('345')] }

			await service.updateSchedulePoints('123', payload)
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Points).replace(
					':id',
					'123'
				)}`
			)

			const expected = dict({
				add: list([ref('345')]),
			})
			expect(
				fetchMock.lastCall(
					`${getUrl(Schedule_Serv_EndPoints.Points).replace(
						':id',
						'123'
					)}`
				)?.[1]?.body
			).toEqual(JSON.stringify(expected.toJSON()))
		})

		it('adds points to a schedule specfied my ref id', async () => {
			const payload = { add: [ref('345')] }

			await service.updateSchedulePoints(ref('123'), payload)
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Points).replace(
					':id',
					'123'
				)}`
			)

			const expected = dict({
				add: list([ref('345')]),
			})
			expect(
				fetchMock.lastCall(
					`${getUrl(Schedule_Serv_EndPoints.Points).replace(
						':id',
						'123'
					)}`.replace('begin:', '')
				)?.[1]?.body
			).toEqual(JSON.stringify(expected.toJSON()))
		})

		it('removes points to a schedule', async () => {
			const payload = { remove: [ref('345')] }

			await service.updateSchedulePoints('123', payload)
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Points).replace(
					':id',
					'123'
				)}`
			)

			const expected = dict({
				remove: list([ref('345')]),
			})
			expect(
				fetchMock.lastCall(
					`${getUrl(Schedule_Serv_EndPoints.Points).replace(
						':id',
						'123'
					)}`
				)?.[1]?.body
			).toEqual(JSON.stringify(expected.toJSON()))
		})

		it('adds and removes the points from the schedule', async () => {
			const payload = { add: [ref('abc')], remove: [ref('345')] }

			await service.updateSchedulePoints('123', payload)
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Points).replace(
					':id',
					'123'
				)}`
			)

			const expected = dict({
				add: list([ref('abc')]),
				remove: list([ref('345')]),
			})
			expect(
				fetchMock.lastCall(
					`${getUrl(Schedule_Serv_EndPoints.Points).replace(
						':id',
						'123'
					)}`
				)?.[1]?.body
			).toEqual(JSON.stringify(expected.toJSON()))
		})

		it('returns empty array when the nothing is specified to be added ot removed', async () => {
			const resp = await service.updateSchedulePoints(ref('123'), {
				add: [],
				remove: [],
			})
			expect(resp).toEqual([])
		})
	})

	describe('#getScheduleCalendars()', () => {
		beforeEach(() => {
			resp = HGrid.make(SampleCalendar())
			prepareMock(
				'get',
				Schedule_Serv_EndPoints.ScheduleCalendars.replace(':id', '123'),
				resp
			)
		})

		it('returns all the calendars for a schedule identified by string id', async () => {
			await service.getScheduleCalendars('123')
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.ScheduleCalendars).replace(
					':id',
					'123'
				)}`
			)
		})

		it('returns all the calendars for a schedule identified by ref id', async () => {
			await service.getScheduleCalendars(ref('123'))
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.ScheduleCalendars).replace(
					':id',
					'123'
				)}`
			)
		})
	})

	describe('#readCalendars()', () => {
		beforeEach((): void => {
			resp = HGrid.make(SampleCalendar())
			prepareMock('get', Schedule_Serv_EndPoints.Calendars, resp)
		})

		it('fetches the calendars with no params/options', async () => {
			await service.readCalendars()
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Calendars)}`
			)
		})

		it('fetches the calendars based on a filter', async () => {
			await service.readCalendars({ filter: 'dis=="sample"' })
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(
					Schedule_Serv_EndPoints.Calendars
				)}?filter=${encodeURIComponent('dis=="sample"')}`
			)
		})

		it('fetches the calendars and limits them to 1 item', async () => {
			await service.readCalendars({ options: { limit: 1 } })
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Calendars)}?limit=1`
			)
		})

		it('fetches the calendars and asks for only some columns/props specified', async () => {
			await service.readCalendars({
				options: { columns: ['dis', 'mod'] },
			})
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(
					Schedule_Serv_EndPoints.Calendars
				)}?columns=${encodeURI('dis|mod')}`
			)
		})

		it('fetches the calendars and sorts the result by some column names', async () => {
			await service.readCalendars({
				options: { sort: ['dis', 'mod'] },
			})
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Calendars)}?sort=${encodeURI(
					'dis|mod'
				)}`
			)
		})

		it('fetches the calendars with all query params', async () => {
			await service.readCalendars({
				filter: 'area > 20',
				options: {
					columns: ['dis', 'mod'],
					limit: 2,
					sort: ['dis', 'id'],
				},
			})

			const expected = `columns=${encodeURI(
				'dis|mod'
			)}&limit=2&sort=${encodeURI('dis|id')}&filter=${encodeURIComponent(
				'area > 20'
			)}`

			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Calendars)}?${expected}`
			)
		})
	})

	describe('#createCalendars()', () => {
		beforeEach(() => {
			resp = HGrid.make(SampleCalendar())
			prepareMock('post', Schedule_Serv_EndPoints.Calendars, resp)
		})

		it('creates a single calendar', async () => {
			const payload = SampleCalendar()
			payload.remove('id')
			payload.remove('mod')

			await service.createCalendars(payload)
			expect(
				fetchMock.lastCall(
					getUrl(Schedule_Serv_EndPoints.Calendars)
				)?.[1]?.body
			).toEqual(JSON.stringify(payload.toJSON()))
		})

		it('creates multiple calendars', async () => {
			const d1 = SampleCalendar()
			d1.remove('id')
			d1.remove('mod')

			const d2 = HDict.make(d1)
			const payload = HGrid.make([d1, d2])

			await service.createCalendars(payload)
			expect(
				fetchMock.lastCall(
					getUrl(Schedule_Serv_EndPoints.Calendars)
				)?.[1]?.body
			).toEqual(JSON.stringify(payload.toJSON()))
		})
	})

	describe('#readCalendarById()', () => {
		beforeEach(() => {
			resp = HGrid.make(SampleCalendar())
			prepareMock(
				'get',
				Schedule_Serv_EndPoints.Calendar.replace(':id', '123'),
				resp
			)
		})

		it('reads a particular calendar by string id', async () => {
			await service.readCalendarById('123')
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Calendar).replace(
					':id',
					'123'
				)}`
			)
		})

		it('reads a particular calendar by ref', async () => {
			await service.readCalendarById(ref('123'))
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Calendar).replace(
					':id',
					'123'
				)}`
			)
		})
	})

	describe('#updateCalendar()', () => {
		beforeEach(() => {
			resp = HGrid.make(SampleCalendar())
			prepareMock(
				'patch',
				Schedule_Serv_EndPoints.Calendar.replace(':id', 'c123'),
				resp
			)
		})

		it('updates a calendar specified by an id', async () => {
			const cal = SampleCalendar()

			await service.updateCalendar(cal)
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Calendar).replace(
					':id',
					'c123'
				)}`
			)
			expect(
				fetchMock.lastCall(
					getUrl(Schedule_Serv_EndPoints.Calendar).replace(
						':id',
						'c123'
					)
				)?.[1]?.body
			).toEqual(JSON.stringify(cal.toJSON()))
		})

		it('throws error if the rec does not have an id', async () => {
			const cal = SampleCalendar()
			cal.remove('id')

			expect(service.updateCalendar(cal)).rejects.toEqual(
				new Error(ScheduleMessages.BadRequest)
			)
		})
	})

	describe('#deleteCalendar()', () => {
		beforeEach(() => {
			resp = HGrid.make(SampleCalendar())
			prepareMock(
				'delete',
				Schedule_Serv_EndPoints.Calendar.replace(':id', '123'),
				resp
			)
		})

		it('deletes a particular calendar indentified by string id', async () => {
			await service.deleteCalendar('123')
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Calendar).replace(
					':id',
					'123'
				)}`
			)
		})

		it('deletes a particular calendar identified by ref id', async () => {
			await service.deleteCalendar(ref('123'))
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.Calendar).replace(
					':id',
					'123'
				)}`
			)
		})
	})

	describe('#getCalendarSchedules()', () => {
		beforeEach(() => {
			resp = HGrid.make(SampleScheduleObj())
			prepareMock(
				'get',
				Schedule_Serv_EndPoints.CalendarSchedules.replace(':id', '123'),
				resp
			)
		})

		it('returns all the schedules for a calendar identified by string id', async () => {
			await service.getCalendarSchedules('123')
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.CalendarSchedules).replace(
					':id',
					'123'
				)}`
			)
		})

		it('returns all the schedules for a calendar identified by ref id', async () => {
			await service.getCalendarSchedules(ref('123'))
			expect(fetchMock.lastUrl()).toEqual(
				`${getUrl(Schedule_Serv_EndPoints.CalendarSchedules).replace(
					':id',
					'123'
				)}`
			)
		})
	})
})
