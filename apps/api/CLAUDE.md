# @healthmate/api

`api` is the composition root. It is the only place that builds concrete implementations and connects them. It maps between `core` and `contracts`, and it holds no domain rule. The stack is Hono on Node.

## Layout

```
src/
  main.ts          reads the environment, builds the deps, starts the server
  env.ts           parses process.env with 1 zod schema
  deps.ts          createDeps(env), the only place that calls createDb and the provider factories
  app.ts           createApp(deps), returns the Hono app, used by main.ts and by tests
  routes/          one file for each resource, for example proposals.ts
  errors.ts        the table from core error names to HTTP status
  middleware/      auth, request id, logging
```

## Composition

- `main.ts` is the only file that reads `process.env`, through `env.ts`. A missing variable stops the start with its name.
- `Clock` is `{ now: () => new Date() }`. `IdGenerator` returns UUIDv7, so ids sort in time order. Both live in `deps.ts`.
- `createApp(deps)` takes all its dependencies, so a test builds the app with the in-memory ports from `@healthmate/core/testing`.
- The server closes the database pool on `SIGTERM` and `SIGINT` before it exits.

## Routes

- A route parses the body, the params and the query with the schema from `contracts`, through `@hono/zod-validator`. A parse failure is a 400 with `{ error: { code: 'invalid_request' } }`.
- A route calls 1 use case from `core` and maps its `Result`. The route has no `if` about the domain.
- `errors.ts` maps each error name to 1 status, for example `*_not_found` to 404, `*_stale`, `*_taken` and `*_already_*` to 409, `proposal_expired` to 410, and `*_invalid` and `*_missing` to 422. The map is `satisfies Record<ApiError, number>`, so a new error name fails to compile until it has a status.
- A route maps the domain value to the view type from `contracts` in 1 function, for example `toProposalView`. It never returns a domain object.
- A route that runs more than 1 write wraps the use case in `inTransaction`.

## Auth

- The auth middleware verifies the Supabase JWT and sets `userId` on the context. A route takes `userId` only from the context, never from the body or a param.
- A route with no auth is listed in `app.ts` by name. Today only `GET /health` has no auth.

## Logs

- Each request logs 1 line at the end with the request id, the route, the status, the duration and the error name.
- A log never holds a body, a transcript, a prompt or entry content. A test sends a request with marked content and fails if the mark appears in the logs.

## Tests

- Route tests use `app.request(...)` with the in-memory ports. They check the status, the response schema and the owner filter with a second user.
- A test compares the enum values in `contracts` with the const arrays in `core`, for example `KINDS`.
