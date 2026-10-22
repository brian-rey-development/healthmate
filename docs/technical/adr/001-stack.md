# ADR-001 Stack

Accepted on 2026-10-22.

## Context

`docs/technical/architecture.md` fixes the stack at a table level. This ADR records the concrete versions and the tooling decisions for the workspace foundation. It tells a later reader why each version is pinned and what changes the decision.

## Decision

The stack follows the table in `docs/technical/architecture.md`. The concrete choices are these.

TypeScript is pinned to `~6.0.3`, not the native TypeScript 7 release. The `typescript-eslint` 8.72 peer range is `typescript <6.1.0`, and the lint pipeline needs the TypeScript compiler API that typescript-eslint consumes. TypeScript 7 breaks type-aware linting today, so the pin stays until typescript-eslint supports it.

Workspace packages export their TypeScript source directly through `exports` maps, for example `"." : "./src/index.ts"`, and there is no build step for internal packages. Each package typechecks with `tsc --noEmit`, and Vitest runs the TypeScript directly. Scripts that run TypeScript directly, such as the seed, use `tsx`, because Node type stripping cannot resolve extensionless relative imports. `apps/api` will still need a bundler or loader decision when it first runs, recorded in its own ADR. There are no `paths` aliases, because an alias bypasses the `exports` maps that keep deep imports out of other packages.

Lint uses the ESLint flat config with the non-type-aware `typescript-eslint` strict preset. Type-aware rules such as `no-floating-promises` are deferred because they make every lint run load the full TypeScript program. They will be added when a bug class justifies the cost.

Architectural boundaries are enforced by `eslint-plugin-boundaries` 7, with `eslint-import-resolver-typescript` so that `@healthmate/*` specifiers resolve through the workspace. The dependency table from `docs/technical/architecture.md` is encoded as policies. Imports into `ports` must be type-only, and the `kind: "type"` dependency selector enforces this. Boundaries does not check imports inside one element, so a syntax rule also rejects any runtime value in `ports`.

Turborepo caches `typecheck` and `test` per package and depends on the upstream task, so a change in `core` invalidates the downstream packages that consume it. Lint has no upstream dependency because boundaries reads only import statements.

Superseded by ADR-003. Postgres originally ran from `postgres:17` under Docker Compose with `healthmate_demo` and `healthmate_personal` databases, and the local Supabase stack now replaces both.

Node 24 is the runtime and pnpm 10.34.6 is the package manager, declared through `packageManager` and `engines`.

## Consequences

Nothing is compiled ahead of time for internal packages. On 2026-10-22 an uncached `pnpm verify` ran 27 tasks in 3.4 seconds, and turbo's cache serves repeated runs. The cost is that TypeScript 6 is one major version behind the native compiler, and that the first runnable app needs a loader decision.

The lint setup is cheap per run, but it cannot catch unawaited promises or unsafe `any` flows that need type information. That gap is accepted until a concrete bug motivates the extra cost.

## Revisit when

typescript-eslint declares support for TypeScript 7, which removes the pin. Type-aware linting becomes necessary for a bug class that reaches review. The first app needs a runtime, which decides the bundler for `apps/api`.
