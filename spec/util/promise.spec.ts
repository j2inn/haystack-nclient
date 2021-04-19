/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { Deferred, makeDeferred } from '../../src/util/promise'

describe('promise', function (): void {
	describe('makeDeferred()', function (): void {
		describe('creates a deferred promise', function (): void {
			let deferred: Deferred

			beforeEach(function (): void {
				deferred = makeDeferred()
			})

			it('that resolves', async function (): Promise<void> {
				if (deferred && deferred.resolve) {
					deferred.resolve()
				}
				await expect(deferred.promise).resolves.toBeUndefined()
			})

			it('that rejects', async function (): Promise<void> {
				if (deferred && deferred.reject) {
					deferred.reject()
				}
				await expect(deferred.promise).rejects.toBeUndefined()
			})
		}) // creates a deferred promise
	}) // makeDeferred()
})
