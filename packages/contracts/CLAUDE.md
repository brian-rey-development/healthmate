# @healthmate/contracts

`contracts` holds every shape that crosses a process boundary. Those are HTTP payloads, channel events, client views and the typed API client. Read the `contracts` row in `docs/technical/architecture.md` first. Agents edit this package only when the task asks for it.

## Layout

- One file for each resource, for example `src/proposals.ts`, `src/timeline.ts` and `src/conversations.ts`. The API client is `src/client.ts`.
- `src/index.ts` exports the schemas, the inferred types and `createApiClient`. Nothing else.
- `contracts` imports only `zod`. It never imports `core`, `database` or `agent`, because the channels import `contracts` and stay small.

## Schemas

- The schema is the source of truth. Write `export const proposalViewSchema = z.object({...})` and `export type ProposalView = z.infer<typeof proposalViewSchema>`.
- Name a schema `<thing>Schema` in camelCase and its type `<Thing>` in PascalCase. A request is `<Action>Request` and a response is `<Action>Response`, for example `ConfirmProposalRequest`.
- An object schema is `z.strictObject`, so an unknown key fails at the boundary.
- A date is `z.iso.date()`, a time is `z.iso.time()` and an instant is `z.iso.datetime({ offset: true })`. A payload never holds a JS `Date`, because JSON has no date type.
- An id is `z.uuid()`. A tool_use id is `z.string().startsWith('toolu_')`.
- An enum lists its values with `z.enum([...])`. The values match the values in `core`, for example `KINDS`, and a test in `apps/api` compares them.
- A string from a person has `.max()`, for example `.max(2000)` for words and `.max(80)` for a display name. The limits match the limits in `core`.
- A list in a response has a fixed maximum, and the request has `limit` with `.max(100)`.
- Never use `.transform()` in a schema that the client also uses to send. A schema that changes data cannot run in both directions.

## Errors

- An error response is `{ error: { code: string } }`. The `code` is the snake_case error name from `core`, for example `proposal_expired`, so the channel picks its own copy.
- A schema for each error union lists the codes with `z.enum`. A channel switches on the code and has a case for each one.

## API client

- `createApiClient({ baseUrl, fetch, getToken })` returns 1 function for each route. Inject `fetch`, so a test passes a fake.
- Each function parses the response with its schema and returns `{ ok: true, value } | { ok: false, error }`. It never throws for a 4xx. It throws only for a network failure or a response that fails its schema.
- Each request has a timeout with `AbortSignal.timeout(10_000)`.

## Changes

- A change that removes or renames a field breaks a deployed channel. Add the new field, move the channels, then remove the old field in a later PR.
- Channel events carry `version: 1`. A breaking change to an event makes `version: 2`, and the api accepts both until no channel sends version 1.

## Tests

- Test each schema with 1 valid example and each rule that rejects, with `it.each`.
- Test the client against a fake `fetch` for a success, a 4xx error code and a response that fails its schema.
