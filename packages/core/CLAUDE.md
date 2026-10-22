# @healthmate/core

Read the `core` sections of `docs/technical/architecture.md` before a change here. The rules below apply to every file in this package. ESLint enforces the layer rules and the module rules.

## Layout

- Each module is a folder in `src`, for example `src/entries`. The modules are `shared`, `users`, `subjects`, `entries` and `conversations`. The timeline is a use case in `entries`, because it only reads entries.
- A module holds its layers as subfolders, `domain`, `ports`, `application` and `testing`. Make a layer folder only when the module needs it.
- Put nothing at the root of `src` except `index.ts` and `testing.ts`.
- Test data that more than 1 test file uses goes in `testing/<module>.fixtures.ts`. A part that more than 1 module uses goes in `shared`.
- `src/index.ts` is `@healthmate/core`. It exports use cases, domain types and port interfaces.
- `src/testing.ts` is `@healthmate/core/testing`. It exports the in-memory ports and the fixtures. Only tests and `apps/api` import it.

## Layers

- `domain` holds types, values and pure rules. It has no `async`, no I/O and no `Date`. It imports only `domain` code.
- `ports` holds interfaces and types only, one interface in each file. It imports `domain` types only.
- `application` holds use cases. A use case loads through ports, asks `domain` for a decision and writes through ports. It imports `domain` and `ports`, and the use cases of earlier modules, so `confirmProposal` can call `saveEntry` from `record-entry.ts`.
- `testing` holds an in-memory implementation of each port that a use case uses. It imports `domain` and `ports`.

## Modules

- The modules have a fixed order, `shared`, `users`, `subjects`, `entries`, `conversations`. A module imports only itself and the modules before it, under the layer rules above.
- `CORE_MODULES` in `eslint.config.mjs` holds the order. Add a new module at its place in that list, or lint fails.
- A `*.test.ts` file can import every layer, so it can use fixtures and in-memory ports from `testing`.
- A proposal is a message, not a stored record. Its type and its rules live in `conversations/domain`.

## Code

- `core` has no runtime dependency. It never imports `zod` or an npm package.
- Time comes from `Clock` and ids come from `IdGenerator`. Both are ports in `shared`. Production code never calls `new Date()` or `Date.now()`, and it uses the `Date` type only for instants.
- A date without a time is an ISO string, `YYYY-MM-DD`. A time of day is `HH:MM:SS`. A month or a year is stored as its first day, so every precision sorts on one column.
- A function that can fail on an expected case returns a `Result`. Pass a failure on with `if (!result.ok) return result;`. Throw only for a bug.
- An error name is a snake_case string literal in the form `<noun>_<problem>`, for example `entry_not_found` or `subject_name_taken`. A name is unique across `core`, because the api and the agent get the merged unions.
- A use case is an async function that takes its dependencies first and its input second. Its `Deps`, `Input` and `Error` types live in the same file, and `index.ts` exports all 3.
- A use case loads, asks `domain` and writes. It holds no rule. It reads `clock.now()` once and passes the value on.
- A value with rules is made by a `create<Value>` function that checks it and returns a `Result`. Code that gets the value can trust it.
- A brand is the only `as` cast in production code, and it lives inside its `create<Value>` function. Tests make branded values with a fixture helper, for example `severity(6)`, not with `as`.
- A union keyed by kind uses `as const satisfies Record<Kind, ...>`, so a new kind fails to compile until every table has it.
- A draft that depends on its kind is a discriminated union, for example `NoteDraft | SymptomDraft`. A field that a kind cannot have is not representable.
- The data that a person confirms is the data that the agent proposed. A use case that acts on a proposal reads the draft from the stored `tool_use` input through the injected `parseDraft`. It never takes a draft from the caller.
- A number with a meaning has a name, for example `PROPOSAL_LIFETIME_MS` or `FIRST_VERSION`. Durations are integer milliseconds.

## Ports and fakes

- A port is one `interface` in its own file. A comment on an operation states what is not obvious. Examples are what `false` means, the sort order and whether a range is inclusive.
- An operation that can return many rows takes a `limit`. A sort order ends with a unique key, so 2 runs give the same order.
- A write that a race can lose returns `boolean`, and the repository decides it in 1 statement. A use case never checks and then writes.
- Add a port operation when a use case, the api or a task in the release plan needs it, not before.
- A fake in `testing` enforces the same contract as the `database` implementation. That includes the owner filter, case-insensitive uniqueness, sort order, version checks and the stored timestamps.
- A fake that differs from Postgres in one detail says so in a comment, for example `toLowerCase()` against `lower()`.
- A fake returns copies or readonly values, so a test cannot change stored state by accident.

## Files and tests

- Name a file after what it holds, in kebab case, for example `entries/domain/date-with-precision.ts` or `conversations/application/confirm-proposal.ts`.
- A test is `<file>.test.ts` next to the file. Test `domain` with pure tests and no fakes. Test `application` against the in-memory ports in `testing`.
- A test checks 1 behavior, and its name says the behavior. Use `it.each` for a table of inputs.
- Test each boundary on both sides, for example 80 and 81 characters, or 24 hours and 24 hours plus 1 ms.
- Test each owner filter with a second user who gets nothing back, also through the use case.
- Test the branch where a repository returns `false`, with a fake that returns `false`. A sequential test does not reach that branch.
- Assert the full `Result` with `toEqual`, for example `{ ok: false, error: 'entry_not_found' }`. Do not assert `result.ok && ...`.
- A fixture that more than 1 module needs goes in `testing.ts`, so `apps/api` tests use the same data.
