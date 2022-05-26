/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import {
	Watch,
	DEFAULT_POLL_RATE_SECS,
	WatchEventCallback,
} from '../../../src/client/watches/Watch'
import {
	WatchEventType,
	WatchChangedEvent,
} from '../../../src/client/watches/WatchEvent'
import { WatchEvent } from '../../../src/client/watches/WatchEvent'
import { Subject } from '../../../src/client/watches/Subject'
import { HRef, HDict, HStr, Kind } from 'haystack-core'

describe('Watch', function (): void {
	let watch: Watch
	let subject: Subject
	let fooDict: HDict

	beforeEach(function (): void {
		subject = {
			display: 'mockSubject',
			pollRate: DEFAULT_POLL_RATE_SECS,
			refresh: jest.fn().mockReturnValue(Promise.resolve()),
			add: jest.fn().mockReturnValue(Promise.resolve()),
			remove: jest.fn().mockReturnValue(Promise.resolve()),
			on: jest.fn(),
			off: jest.fn(),
			get: jest.fn(),
			inspect: jest.fn(),
		}

		watch = new Watch('test', subject)

		fooDict = HDict.make({
			id: HRef.make('foo'),
			data: HStr.make('some data'),
		})
	})

	function asMock(cb: unknown): jest.Mock {
		return cb as jest.Mock
	}

	async function addToWatch(): Promise<void> {
		asMock(subject.get).mockReturnValue(fooDict)
		await watch.add('foo')
	}

	afterEach(async function (): Promise<void> {
		await watch.close()
	})

	describe('#watches', function (): void {
		it('returns all opened watches', async function (): Promise<void> {
			await addToWatch()
			expect(Watch.watches).toEqual([watch])
		})
	}) // #watches

	describe('#display', function (): void {
		it('returns the display name', function (): void {
			expect(watch.display).toBe('test @ mockSubject')
		})
	}) // #display

	describe('#isClosed()', function (): void {
		it('returns true if the watch is closed', async function (): Promise<void> {
			await watch.close()
			expect(watch.isClosed()).toBe(true)
		})

		it('returns false if the watch is not closed', async function (): Promise<void> {
			expect(watch.isClosed()).toBe(false)
		})
	}) // #isClosed()

	describe('.open()', function (): void {
		let openedWatch: Watch

		beforeEach(async function (): Promise<void> {
			asMock(subject.get).mockReturnValue(fooDict)

			openedWatch = await Watch.open({
				subject,
				ids: 'foo',
				display: 'display',
			})
		})

		afterEach(async function (): Promise<void> {
			await openedWatch.close()
		})

		it('returns a watch with the data added', function (): void {
			expect(openedWatch.grid.get(0)?.toJSON()).toEqual({
				id: { _kind: Kind.Ref, val: 'foo' },
				data: 'some data',
			})
		})
	}) // .open()

	describe('.close()', function (): void {
		let openedWatch: Watch

		beforeEach(async function (): Promise<void> {
			asMock(subject.get).mockReturnValue(fooDict)

			openedWatch = await Watch.open({
				subject,
				ids: 'foo',
				display: 'display',
			})
		})

		it('closes all watches for the subject', async function (): Promise<void> {
			expect(openedWatch.isClosed()).toBe(false)

			await Watch.close(subject)

			expect(openedWatch.isClosed()).toBe(true)
		})
	}) // .close()

	describe('#add()', function (): void {
		it('rejects if the watch is already closed', async function (): Promise<void> {
			await watch.close()
			await expect(addToWatch()).rejects.toBeTruthy()
		})

		it('recalculates the poll rate', async function (): Promise<void> {
			subject.pollRate = 0
			await addToWatch()
			expect(subject.pollRate).toBe(DEFAULT_POLL_RATE_SECS)
		})

		it('adds to the subject', async function (): Promise<void> {
			await addToWatch()
			expect(subject.add).toHaveBeenCalledWith(['foo'])
		})

		it('fires an add event', async function (): Promise<void> {
			const cb = jest.fn()
			watch.on(WatchEventType.Added, cb)
			await addToWatch()

			expect(cb).toHaveBeenCalledWith(
				{
					type: WatchEventType.Added,
					ids: ['foo'],
				},
				watch
			)
		})

		it('does not fire an add event for record that is already added', async function (): Promise<void> {
			await addToWatch()

			const cb = jest.fn()
			watch.on(WatchEventType.Added, cb)

			// Foo is already added so this should not fire any events
			await addToWatch()

			expect(cb).not.toHaveBeenCalled()
		})

		it('does not add to subject for record that is already added', async function (): Promise<void> {
			await addToWatch()
			await addToWatch()

			expect(subject.add).toHaveBeenCalledTimes(1)
		})

		it("adds to the watch's grid", async function (): Promise<void> {
			await addToWatch()
			expect(watch.grid.get(0)?.toJSON()).toEqual({
				id: { _kind: Kind.Ref, val: 'foo' },
				data: 'some data',
			})
		})

		it('adds to the watch list', async function (): Promise<void> {
			await addToWatch()
			expect(Watch.watches[0]).toBe(watch)
		})
	}) // #add()

	describe('#remove()', function (): void {
		async function removeFromWatch(): Promise<void> {
			return await watch.remove('foo')
		}

		it('throws an error if already closed', async function (): Promise<void> {
			await watch.close()
			await expect(removeFromWatch()).rejects.toBeTruthy()
		})

		it('fires an event', async function (): Promise<void> {
			await addToWatch()

			const cb = jest.fn()
			watch.on(WatchEventType.Removed, cb)

			await removeFromWatch()

			expect(cb).toHaveBeenCalledWith(
				{
					type: WatchEventType.Removed,
					ids: ['foo'],
				},
				watch
			)
		})

		it('does not fire an event if data not already watched', async function (): Promise<void> {
			const cb = jest.fn()
			watch.on(WatchEventType.Removed, cb)

			await removeFromWatch()

			expect(cb).not.toHaveBeenCalled()
		})

		it('removes the data from the subject', async function (): Promise<void> {
			await addToWatch()
			await removeFromWatch()
			expect(subject.remove).toHaveBeenCalled()
		})

		it('does not remove the data from the subject if not already watched', async function (): Promise<void> {
			await removeFromWatch()
			expect(subject.remove).not.toHaveBeenCalled()
		})

		it("removes data from the watch's grid", async function (): Promise<void> {
			await addToWatch()
			await removeFromWatch()
			expect(watch.grid.isEmpty()).toBe(true)
		})
	}) // #remove()

	describe('#refresh()', function (): void {
		it('throws an error if already closed', async function (): Promise<void> {
			await watch.close()
			await expect(watch.refresh()).rejects.toBeTruthy()
		})

		it('refreshes the subject', async function (): Promise<void> {
			await watch.refresh()
			expect(subject.refresh).toHaveBeenCalled()
		})

		it('fires an event', async function (): Promise<void> {
			const cb = jest.fn()
			watch.on(WatchEventType.Refreshed, cb)

			await watch.refresh()

			expect(cb).toHaveBeenCalledWith(
				{ type: WatchEventType.Refreshed },
				watch
			)
		})

		it('updates the grid', async function (): Promise<void> {
			await addToWatch()

			const newDict = HDict.make({
				id: HRef.make('foo'),
				data: HStr.make('some data2'),
			})

			asMock(subject.get).mockReturnValue(newDict)

			await watch.refresh()

			expect(watch.grid.get(0)?.toJSON()).toEqual({
				id: { _kind: Kind.Ref, val: 'foo' },
				data: 'some data2',
			})
		})
	}) // #refresh()

	describe('#changed()', function (): void {
		let changed: (event: WatchChangedEvent) => void
		let cb: jest.Mock
		let event: WatchChangedEvent

		beforeEach(function (): void {
			cb = jest.fn()
			watch.on(WatchEventType.Changed, cb)

			// The changed callback is private but is registered with the
			// subject when it's created. Therefore we need to fish it out.
			changed = asMock(subject.on).mock.calls[0][0]

			event = {
				type: WatchEventType.Changed,
				ids: {
					foo: {
						changed: [
							{
								name: 'foo',
								oldValue: HStr.make('goo'),
								value: HStr.make('shoe'),
							},
						],
					},
				},
			}
		})

		it('fire an event for already added data', async function (): Promise<void> {
			await addToWatch()
			changed(event)
			expect(cb).toHaveBeenCalledWith(event, watch)
		})

		it('does not fire an event when there is no data for a watch', function (): void {
			changed(event)
			expect(cb).not.toHaveBeenCalledWith(event, watch)
		})
	}) // #changed()

	describe('#clear()', function (): void {
		it('removes all the records from the watch', async function (): Promise<void> {
			await addToWatch()
			await watch.clear()
			expect(subject.remove).toHaveBeenCalledWith(['foo'])
		})
	}) // #clear()

	describe('#close()', function (): void {
		it('closes the watch', async function (): Promise<void> {
			expect(watch.isClosed()).toBe(false)
			await watch.close()
			expect(watch.isClosed()).toBe(true)
		})

		it('removes all opened data from the subject', async function (): Promise<void> {
			await watch.close()
			expect(subject.remove).toHaveBeenCalled()
		})

		it('does not close twice', async function (): Promise<void> {
			await Promise.all([watch.close(), watch.close()])
			expect(asMock(subject.remove).mock.calls.length).toBe(1)
		})

		it('fires an event', async function (): Promise<void> {
			const cb = jest.fn()
			watch.on(WatchEventType.Closed, cb)

			await watch.close()

			expect(cb).toHaveBeenCalledWith(
				{ type: WatchEventType.Closed },
				watch
			)
		})

		it('empties the grid', async function (): Promise<void> {
			await watch.close()
			expect(watch.grid.isEmpty()).toBe(true)
		})

		it('removes the changed handler', async function (): Promise<void> {
			await watch.close()
			expect(subject.off).toHaveBeenCalled()
		})

		it('removes all callbacks', async function (): Promise<void> {
			watch.on(WatchEventType.Changed, jest.fn())
			expect(watch.hasCallbacks()).toBe(true)
			await watch.close()
			expect(watch.hasCallbacks()).toBe(false)
		})

		it('removes the watch from the watch list', async function (): Promise<void> {
			await addToWatch()
			expect(Watch.watches).toEqual([watch])
			await watch.close()
			expect(Watch.watches.length).toBe(0)
		})

		it('recalculates the poll rate', async function (): Promise<void> {
			subject.pollRate = 0
			await watch.close()
			expect(subject.pollRate).toBe(DEFAULT_POLL_RATE_SECS)
		})
	}) // #close()

	describe('#pollRate', function (): void {
		let watchOther: Watch

		beforeEach(async function (): Promise<void> {
			watchOther = new Watch('other', subject)
			await Promise.all([watchOther.add('boo'), addToWatch()])
		})

		afterEach(async function (): Promise<void> {
			await watchOther.close()
		})

		it('computes the smallest poll rate from a number of watches', async function (): Promise<void> {
			subject.pollRate = 0

			watch.pollRate = 1
			watchOther.pollRate = 2

			expect(subject.pollRate).toBe(1)
		})

		it('falls back to the default poll rate if calculated as zero', async function (): Promise<void> {
			subject.pollRate = 5

			watch.pollRate = 0
			watchOther.pollRate = 0

			expect(subject.pollRate).toBe(DEFAULT_POLL_RATE_SECS)
		})

		it('falls back to the default poll rate if calculated as less than', async function (): Promise<void> {
			subject.pollRate = 5

			watch.pollRate = -1
			watchOther.pollRate = 0

			expect(subject.pollRate).toBe(DEFAULT_POLL_RATE_SECS)
		})
	}) // #pollRate

	describe('#changed()', function (): void {
		let cb: jest.Mock
		let event: WatchChangedEvent

		beforeEach(async function (): Promise<void> {
			await addToWatch()
			cb = jest.fn()

			event = {
				type: WatchEventType.Changed,
				ids: {
					foo: {
						changed: [
							{
								name: 'data',
								oldValue: HStr.make('some data'),
								value: HStr.make('some new data'),
							},
						],
					},
				},
			}
		})

		function fireEvent(): void {
			watch.fire(event)
		}

		it('invokes callback', async function (): Promise<void> {
			watch.changed({ callback: cb })
			fireEvent()
			expect(cb).toHaveBeenCalledWith(event, watch)
		})

		it('invokes callback with interest on changed', async function (): Promise<void> {
			watch.changed({ interests: ['data'], callback: cb })
			fireEvent()
			expect(cb).toHaveBeenCalledWith(event, watch)
		})

		it('invokes callback with interest on added', async function (): Promise<void> {
			event = {
				type: WatchEventType.Changed,
				ids: {
					foo: {
						added: [
							{
								name: 'data',
								value: HStr.make('some new data'),
							},
						],
					},
				},
			}

			watch.changed({ interests: ['data'], callback: cb })
			fireEvent()
			expect(cb).toHaveBeenCalledWith(event, watch)
		})

		it('invokes callback with interest on removed', async function (): Promise<void> {
			event = {
				type: WatchEventType.Changed,
				ids: {
					foo: {
						removed: [
							{
								name: 'data',
								value: HStr.make('some new data'),
							},
						],
					},
				},
			}

			watch.changed({ interests: ['data'], callback: cb })
			fireEvent()
			expect(cb).toHaveBeenCalledWith(event, watch)
		})

		it('does not invoke callback with different data', async function (): Promise<void> {
			event = {
				type: WatchEventType.Changed,
				ids: {
					foo: {
						removed: [
							{
								name: 'somethingElse',
								value: HStr.make('some new data'),
							},
						],
					},
				},
			}

			watch.changed({ interests: ['data'], callback: cb })
			fireEvent()
			expect(cb).not.toHaveBeenCalled()
		})

		it('does not invoke a callback with a different interest', async function (): Promise<void> {
			watch.changed({ interests: ['somethingElse'], callback: cb })
			fireEvent()
			expect(cb).not.toHaveBeenCalled()
		})

		it('invokes callback with a matching haystack filter', async function (): Promise<void> {
			watch.changed({ condition: 'data == "some data"', callback: cb })
			fireEvent()
			expect(cb).toHaveBeenCalledWith(event, watch)
		})

		it('does not invoke a callback when haystack filter does not match', async function (): Promise<void> {
			watch.changed({
				condition: 'data == "something else"',
				callback: cb,
			})
			fireEvent()
			expect(cb).not.toHaveBeenCalled()
		})
	}) // #changed()

	describe('events', function (): void {
		let callback: WatchEventCallback

		beforeEach(function (): void {
			callback = jest.fn()
			watch.on(WatchEventType.Changed, callback)
		})

		describe('#on()', function (): void {
			it('registers a new callback', function (): void {
				expect(watch.getCallbacks(WatchEventType.Changed)).toEqual([
					callback,
				])
			})

			it('does not reregister the same callback', function (): void {
				watch.on(WatchEventType.Changed, callback)

				expect(watch.getCallbacks(WatchEventType.Changed)).toEqual([
					callback,
				])
			})

			it('returns the emitter', function (): void {
				expect(watch.on(WatchEventType.Changed, callback)).toBe(watch)
			})

			it('throws an error if the watch is already closed', async function (): Promise<void> {
				await watch.close()

				expect((): void => {
					watch.on(WatchEventType.Changed, callback)
				}).toThrow()
			})
		}) // #on()

		describe('#off()', function (): void {
			it('unregisters a callback', function (): void {
				watch.off(WatchEventType.Changed, callback)

				expect(watch.hasCallbacks(WatchEventType.Changed)).toBe(false)
			})

			it('does not unregister the subject callback when there are still callbacks', function (): void {
				watch.on(WatchEventType.Added, callback)
				watch.off(WatchEventType.Changed, callback)

				expect(watch.hasCallbacks()).toBe(true)
				expect(subject.off).not.toHaveBeenCalled()
			})

			it('returns the emitter', function (): void {
				expect(watch.off(WatchEventType.Changed, callback)).toBe(watch)
			})
		}) // #off()

		describe('#fire()', function (): void {
			let event: WatchEvent

			beforeEach(function (): void {
				event = { type: WatchEventType.Changed }
			})

			it('fires an event handler', function (): void {
				watch.fire(event)
				expect(callback).toHaveBeenCalledWith(event, watch)
			})

			it('catches any errors in an event handler', function (): void {
				jest.spyOn(console, 'error').mockImplementation()

				watch.on(WatchEventType.Changed, (): void => {
					throw new Error('hello')
				})

				expect((): void => {
					watch.fire(event)
				}).not.toThrow()

				expect(console.error).toHaveBeenCalled()
			})

			it('returns the emitter', function (): void {
				expect(watch.fire(event)).toBe(watch)
			})
		}) // #fire()

		describe('#getCallbacks()', function (): void {
			let otherCallback: WatchEventCallback

			beforeEach(function (): void {
				otherCallback = jest.fn()
				watch.on(WatchEventType.Added, otherCallback)
			})

			it('returns all callbacks for a changed event', function (): void {
				expect(watch.getCallbacks(WatchEventType.Changed)).toEqual([
					callback,
				])
			})

			it('returns all callbacks for an add event', function (): void {
				expect(watch.getCallbacks(WatchEventType.Added)).toEqual([
					otherCallback,
				])
			})

			it('returns all callbacks', function (): void {
				expect(watch.getCallbacks()).toEqual([callback, otherCallback])
			})

			it('returns a callback with the subject', function (): void {
				expect(subject.on).toHaveBeenCalled()
			})
		}) // #getCallbacks()

		describe('#hasCallbacks()', function (): void {
			it('returns true if there are callbacks for changed events', function (): void {
				expect(watch.hasCallbacks(WatchEventType.Changed)).toBe(true)
			})

			it('returns false if there are no callbacks for an add event', function (): void {
				expect(watch.hasCallbacks(WatchEventType.Added)).toBe(false)
			})

			it('returns true if there are any callbacks', function (): void {
				expect(watch.hasCallbacks()).toBe(true)
			})
		}) // #hasCallbacks()

		describe('#clearCallbacks()', function (): void {
			it('clears all event handlers', function (): void {
				watch.clearCallbacks()
				expect(watch.hasCallbacks()).toBe(false)
			})

			it('returns the emitter instance', function (): void {
				expect(watch.clearCallbacks()).toBe(watch)
			})

			it('clears the callback handler from the subject', function (): void {
				watch.clearCallbacks()
				expect(subject.off).toHaveBeenCalled()
			})
		}) // #clearCallbacks()
	}) // events
})
