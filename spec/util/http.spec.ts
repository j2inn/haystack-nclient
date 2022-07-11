/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { HRef, HList } from 'haystack-core'
import {
	getOrigin,
	hasHeader,
	getHeader,
	addHeader,
	HeadersObj,
	getOpUrl,
	getHaystackServiceUrl,
	getHostServiceUrl,
	encodeQuery,
	addStartSlashRemoveEndSlash,
	removeHeader,
} from '../../src/util/http'
import { Headers as NodeHeaders } from 'node-fetch'

describe('http', function (): void {
	describe('encodeQuery', function (): void {
		it('returns an empty string for an empty object', function (): void {
			expect(encodeQuery({})).toBe('')
		})

		it('encodes a string', function (): void {
			expect(encodeQuery({ str: 'foo and bar' })).toBe(
				'?str=foo%20and%20bar'
			)
		})

		it('encodes an array of strings', function (): void {
			expect(encodeQuery({ strs: ['foo', 'boo'] })).toBe(
				'?strs=foo%7Cboo'
			)
		})

		it('skips encoding undefined values', function (): void {
			expect(encodeQuery({ str: 'foo and bar', ignore: undefined })).toBe(
				'?str=foo%20and%20bar'
			)
		})

		it('encodes a ref', function (): void {
			expect(encodeQuery({ ref: HRef.make('foo') })).toBe('?ref=foo')
		})

		it('encodes a number', function (): void {
			expect(encodeQuery({ num: 1.2 })).toBe('?num=1.2')
		})

		it('encodes a boolean', function (): void {
			expect(encodeQuery({ bool: true })).toBe('?bool=true')
		})

		it('encodes a list', function (): void {
			expect(
				encodeQuery({
					list: HList.make([HRef.make('foo'), HRef.make('boo')]),
				})
			).toBe('?list=foo%7Cboo')
		})

		it('encodes many values', function (): void {
			expect(encodeQuery({ str: 'foo', str2: 'bar' })).toBe(
				'?str=foo&str2=bar'
			)
		})
	}) // encodeQuery

	function makeHeaders(headers: { [prop: string]: string }): Headers {
		return new NodeHeaders(headers) as unknown as Headers
	}

	describe('getOrigin()', function (): void {
		it('returns the origin for an absolute URL with a path', function (): void {
			expect(getOrigin('https://www.foobar.com/this/that')).toBe(
				'https://www.foobar.com'
			)
		})

		it('returns the origin for an absolute URL with a trailing slash', function (): void {
			expect(getOrigin('https://www.foobar.com/')).toBe(
				'https://www.foobar.com'
			)
		})

		it('returns the origin for an absolute URL', function (): void {
			expect(getOrigin('https://www.foobar.com')).toBe(
				'https://www.foobar.com'
			)
		})

		it('returns an empty string when for a relative path to the root', function (): void {
			expect(getOrigin('/')).toBe('')
		})

		it('returns an empty string when for a relative path', function (): void {
			expect(getOrigin('/this/that')).toBe('')
		})
	}) // getOrigin()

	describe('hasHeader()', function (): void {
		it('returns false when the headers object is undefined', function (): void {
			expect(hasHeader(undefined, 'foo')).toBe(false)
		})

		it('returns true when an header object has the header', function (): void {
			expect(hasHeader(makeHeaders({ foo: '' }), 'foo')).toBe(true)
		})

		it('returns false when an header object has not got the header', function (): void {
			expect(hasHeader(makeHeaders({ goo: '' }), 'foo')).toBe(false)
		})

		it('returns true when an header object literal has the header', function (): void {
			expect(hasHeader({ foo: '' }, 'foo')).toBe(true)
		})

		it('returns false when an header object literal has not got the header', function (): void {
			expect(hasHeader({ goo: '' }, 'foo')).toBe(false)
		})
	}) // hasHeader()

	describe('getHeader()', function (): void {
		it('returns false when the header object is undefined', function (): void {
			expect(getHeader(undefined, 'foo')).toBeUndefined()
		})

		it('returns the value when an header object has the header', function (): void {
			expect(getHeader(makeHeaders({ foo: 'val' }), 'foo')).toBe('val')
		})

		it('returns undefined when an header object has not got the header', function (): void {
			expect(getHeader(makeHeaders({ goo: '' }), 'foo')).toBeUndefined()
		})

		it('returns the value when an header object literal has the header', function (): void {
			expect(getHeader({ foo: 'val' }, 'foo')).toBe('val')
		})

		it('returns undefined when an header object literal has not got the header', function (): void {
			expect(getHeader({ goo: '' }, 'foo')).toBeUndefined()
		})
	}) // getHeader()

	describe('addHeader()', function (): void {
		it('sets a value in an existing headers object', function (): void {
			const headers = makeHeaders({})
			addHeader({ headers }, 'foo', 'val')
			expect(headers.get('foo')).toBe('val')
		})

		it('adds to an existing headers object literal with a new value', function (): void {
			const headers: HeadersObj = {}
			const obj = { headers }
			addHeader(obj, 'foo', 'val')
			expect(obj.headers).toBe(headers)
			expect(obj.headers.foo).toBe('val')
		})

		it('creates an new headers object literal with the new value', function (): void {
			const obj: { headers?: { [prop: string]: string } } = {}
			addHeader(obj, 'foo', 'val')
			expect(obj.headers?.foo).toBe('val')
		})
	}) // addHeader()

	describe('removeHeader()', function (): void {
		it('sets a value in an existing headers object then remove', function (): void {
			const headers = makeHeaders({})
			addHeader({ headers }, 'foo', 'val')
			expect(headers.get('foo')).toBe('val')
			removeHeader(headers, 'foo')
			expect(headers.get('foo')).toBeNull()
		})

		it('adds to an existing headers object literal with a new value then remove', function (): void {
			const headers: HeadersObj = {}
			const obj = { headers }
			addHeader(obj, 'foo', 'val')
			expect(obj.headers).toBe(headers)
			expect(obj.headers.foo).toBe('val')
			removeHeader(obj.headers, 'foo')
			expect(obj.headers.foo).toBeUndefined()
		})

		it('creates an new headers object literal with the new value then remove', function (): void {
			const obj: { headers?: { [prop: string]: string } } = {}
			addHeader(obj, 'foo', 'val')
			expect(obj.headers?.foo).toBe('val')
			removeHeader(obj.headers, 'foo')
			expect(obj.headers?.foo).toBeUndefined()
		})
	}) // removeHeader()

	describe('#getOpUrl()', function (): void {
		it('returns a URL', function (): void {
			expect(
				getOpUrl({
					origin: 'https://localhost:8080',
					pathPrefix: '',
					project: 'demo',
					op: 'ops',
				})
			).toBe('https://localhost:8080/api/demo/ops')
		})

		it('returns updated url when prefix is sent', function (): void {
			expect(
				getOpUrl({
					origin: 'https://localhost:8080',
					pathPrefix: '/prefix/path',
					project: 'demo',
					op: 'ops',
				})
			).toBe('https://localhost:8080/prefix/path/api/demo/ops')
		})
	}) // #getOpUrl()

	describe('#getHaystackServiceUrl()', function (): void {
		it('returns a URL', function (): void {
			expect(
				getHaystackServiceUrl({
					origin: 'https://localhost:8080',
					pathPrefix: '',
					project: 'demo',
					path: 'service',
				})
			).toBe('https://localhost:8080/api/haystack/demo/service')
		})

		it('returns a URL with no project name', function (): void {
			expect(
				getHaystackServiceUrl({
					origin: 'https://localhost:8080',
					pathPrefix: '',
					project: '',
					path: 'service',
				})
			).toBe('https://localhost:8080/api/haystack/service')
		})

		it('returns updated url when sending in a path prefix', function (): void {
			expect(
				getHaystackServiceUrl({
					origin: 'https://localhost:8080',
					pathPrefix: '/prefix/path',
					project: '',
					path: 'service',
				})
			).toBe('https://localhost:8080/prefix/path/api/haystack/service')
		})
	}) // #getHaystackServiceUrl()

	describe('#getHostServiceUrl()', function (): void {
		it('returns a URL', function (): void {
			expect(
				getHostServiceUrl({
					origin: 'https://localhost:8080',
					pathPrefix: '',
					path: 'service',
				})
			).toBe('https://localhost:8080/api/host/service')
		})

		it('should return updated url when path prefix is sent in', function (): void {
			expect(
				getHostServiceUrl({
					origin: 'https://localhost:8080',
					pathPrefix: '/path/prefix',
					path: 'service',
				})
			).toBe('https://localhost:8080/path/prefix/api/host/service')
		})
	}) // #getHaystackServiceUrl()

	describe('addStartSlashRemoveEndSlash()', function (): void {
		it('returns an empty string', function (): void {
			expect(addStartSlashRemoveEndSlash('')).toBe('')
		})

		it('returns an empty string for a slash', function (): void {
			expect(addStartSlashRemoveEndSlash('/')).toBe('')
		})

		it('adds a starting slash', function (): void {
			expect(addStartSlashRemoveEndSlash('foo/bar')).toBe('/foo/bar')
		})

		it('removes an ending slash', function (): void {
			expect(addStartSlashRemoveEndSlash('/foo/bar/')).toBe('/foo/bar')
		})
	}) // addStartSlashRemoveEndSlash()
})
