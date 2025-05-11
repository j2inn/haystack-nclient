<p align="center">
  <a href="https://github.com/j2inn/haystack-nclient/actions/workflows/master-push-pull-request.yaml">
    <img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/j2inn/haystack-nclient/master-push-pull-request.yaml" />
  </a>

  <a href="https://github.com/j2inn/haystack-nclient/blob/master/LICENSE">
    <img alt="GitHub" src="https://img.shields.io/github/license/j2inn/haystack-nclient" />
  </a>
</p>

# Haystack Client

A network client [haystack](https://project-haystack.org/) implementation written in TypeScript. This API targets standard Haystack web servers plus other non-standard implementations.

This library uses [haystack-core](https://github.com/j2inn/haystack-core).

Optionally use [haystack-units](https://github.com/j2inn/haystack-units) for the unit database.

If you're building an application using [React](https://reactjs.org/) try using [haystack-react](https://github.com/j2inn/haystack-react) in addition to the core and client libraries.

## Installation

Use the following `npm` command to install haystack client...

```
npm install haystack-core haystack-units haystack-nclient
```

Note how haystack-core must be installed as a peer dependency.

## APIs

Please click [here](https://tu1lu98z65.execute-api.us-east-1.amazonaws.com/default/j2docs/j2inn/haystack-nclient/index.html) for the API documentation.

## Servers

This library is used to talk to array of different Haystack servers...

-   FIN 5.X: only use the methods under Client `ops` and `ext`.
    -   Everything under `ops` uses all the standard Haystack Ops.
    -   Everything under `ext` uses methods specific to SkySpark (i.e. evaluating Axon).
-   Future: in addition to `ops`, try using the newer Haystack enabled REST API services under Client (i.e. `record`, `schedule`, `user` or `proj`). Prefer REST API services over `ops`. Never use `ext`.

## Client

A set of useful high level of APIs for working with Haystack data in the FIN framework's server.

```typescript
// Query all the available sites server side using the Haystack read op...
const grid = await client.ops.read('site')
```

Unless you're building your own APIs, it's recommended to use the Client APIs. These APIs build on top of the `fetchVal` API.

### Construction

Please note, since a Client instance contains state (i.e. maintains a list of watches), always cache and reuse a Client instance. Do _not_ create a new Client instance everytime you use it!

If you're using [haystack-react](hhttps://github.com/j2inn/haystack-react), the Client is created from a React Context. Use a hook called `useClient()` to get access to the Client.

If you need to create your own Client object...

#### FIN5

```typescript
// Create a client object using the web browser's current URI.
// The project name will be parsed from the URI.
const client = new Client({
	base: new URL(window.location.href),
})

// Explicitly define what project to use...
const clientWithProject = new Client({
	base: new URL(window.location.href),
	project: 'demo',
})
```

## Watch

Please note, [haystack-react](https://github.com/j2inn/haystack-react) contains some hooks that makes this even easier!

Watches are used to watch for live events on records...

```typescript
// Resolve a grid with ids.
const grid = await client.ops.read('point and navName == "SAT"')

// Create a watch and give it a display name.
const watch = await client.ops.watch.make('All SAT points', grid)

// Add event handlers. We're only interested in 'curVal' changes.
watch.changed({
	interests: ['curVal'],
	callback: (event) => console.log(event)
})

...

// Always close a watch after using it.
await watch.close()
```

Haystack filters can also be used to watch for specific conditions...

```typescript
// Add event handlers. We're only interested in changes to curVal when it's above a certain value.
watch.changed({
	interests: ['curVal'],
	condition: 'curVal > 50°F',
	callback: (event) => console.log(event),
})
```

## fetchVal

The `fetchVal` API builds on top of `hsFetch`. It adds all the necessary encoding and decoding of a haystack value in one API call.

```typescript
const dict = await fetchVal<HDict>('/api/demo/somethingnew')
```

For backwards compatibility, there is also a `fetchGrid` that calls `fetchVal`.

### Hayson

Decoding values from Hayson will happen transparently when the server responds with the correct MIME type.

To send Hayson, consider the following code...

```typescript
const dict = await fetchVal<HDict>('/api/demo/somethingnew', {
	method: 'POST',
	headers: { 'content-type': HAYSON_MIME_TYPE },
	body: JSON.stringify(hval.toJSON()),
})
```

## finCsrfFetch

The [fetch](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch) API is used by web developers to make network calls.

The `finCsrfFetch` API wraps [fetch](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch) and automatic background management
of CSRF tokens (a.k.a. Attest Keys) for the FIN framework.

Use this API if you want to work with the web server but aren't going to work with grids.

```typescript
// Call a JSON REST API...
const resp = await finCsrfFetch('/someApi')
const someJson = await resp.json()
```
