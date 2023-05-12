/*
 * Copyright (c) 2023, J2 Innovations. All Rights Reserved
 */

/**
 * Ensures at least one of the provided properties are present on the Type.
 *
 * @example
 * type Schedule = AtLeastOne<
 * 	ScheduleObj,
 * 	'exceptionSchedule' | 'weeklySchedule'
 * >
 */
export type AtLeastOne<T, R extends keyof T = keyof T> = Omit<T, R> &
	{ [P in R]: Required<Pick<T, P>> & Partial<Omit<T, P>> }[R]
