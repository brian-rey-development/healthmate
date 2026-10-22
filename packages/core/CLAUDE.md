# @healthmate/core

Read the `core` sections of `docs/technical/architecture.md` before a change here. The rules below apply to every file in this package. ESLint enforces the layer rules and the module rules.

## Layout

- Each module is a folder in `src`, for example `src/entries`. The modules are `shared`, `entries`, `subjects`, `tool-calls`, `conversations` and `timeline`.
- A module holds its layers as subfolders, `domain`, `ports`, `application` and `testing`. Make a layer folder only when the module needs it.
- Put nothing at the root of `src` except `index.ts` and `testing.ts`. A part that more than 1 module uses goes in `shared`.
- `src/index.ts` is `@healthmate/core`. It exports use cases, domain types and port interfaces.
- `src/testing.ts` is `@healthmate/core/testing`. It exports the in-memory ports. Only tests and `apps/api` import it.

## Layers

- `domain` holds types, values and pure rules. It has no `async`, no I/O and no `Date`. It imports only `domain` code.
- `ports` holds interfaces and types only, one interface in each file. It imports `domain` types only.
- `application` holds use cases. A use case loads through ports, asks `domain` for a decision and writes through ports. It imports `domain` and `ports`.
- `testing` holds an in-memory implementation of each port. It imports `domain` and `ports`.

## Modules

- A module can import the same layer of another module, under the layer rules above.
- `shared` imports no module. `entries` imports only `shared`. `subjects` imports only `shared`.
- `tool-calls`, `conversations` and `timeline` can import `entries` and `subjects`.

## Code

- `core` has no runtime dependency. It never imports `zod` or an npm package.
- Time comes from `Clock` and ids come from `IdGenerator`. Both are ports in `shared`.
- A function that can fail on an expected case returns a `Result`. An error name is a snake_case string literal, for example `"stale"`.
- A use case is an async function that takes its dependencies first and its input second. Its dependencies, input and error union live in the same file.
- A value with rules is made by a function that checks it and returns a `Result`. Code that gets the value can trust it.

## Files and tests

- Name a file after what it holds, in kebab case, for example `entries/domain/date-with-precision.ts` or `tool-calls/application/confirm-proposal.ts`.
- A test is `<file>.test.ts` next to the file. Test `domain` with pure tests and no fakes. Test `application` against the in-memory ports in `testing`.
