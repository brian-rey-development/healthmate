# ADR-002 Drizzle replaces Kysely and hand-written migrations

Accepted on 2026-10-22, amended by ADR-003 for where migrations live and which tool applies them. Supersedes the Database row of the stack table in `docs/technical/architecture.md` and the Kysely choice it implied for ADR-001.

## Context

The original stack used plain SQL migrations written by hand and Kysely for queries. That keeps the schema in two places, the migration files and the Kysely table types. A developer must keep the two in sync by hand. The project owner chose Drizzle so that one TypeScript schema produces both the query types and the migrations.

## Decision

`packages/db/src/schema.ts` is the single source for table definitions. Drizzle Kit 0.31 generates SQL migrations from it into `supabase/migrations` (originally `packages/db/migrations`, see ADR-003), and those files are committed and reviewed like code. Generated migrations are plain SQL, so a reviewer reads exactly what will run. When Drizzle cannot express something, a person can edit a migration before its first apply. A migration that has been applied anywhere is never edited, and a fix is a new migration.

Drizzle ORM 0.45 talks to Postgres through postgres.js 3, which is a pure-JavaScript driver with no native build step and pipelined queries. Both configs set `casing: "snake_case"`, so TypeScript keys stay camelCase while columns are snake_case without a name on every column.

Tables carry no database defaults for ids or timestamps. In this design, ids come from `IdGenerator` and time comes from `Clock` in `core`. A database default lets a write skip both, and nobody sees it.

Stable releases are used, not the 1.0 beta line. The upgrade to Drizzle 1.0 gets its own ADR when it is stable.

CI applies migrations with the Supabase CLI, regenerates them, and fails when the schema changed without a committed migration.

## Consequences

Repositories in `db` map between `UserRow` and the domain type, so the stored shape stays separate from the domain shape, as `docs/technical/architecture.md` requires. Drizzle types never cross into `core`.

Drizzle's query builder is less close to SQL than Kysely's. For a complex query, the `sql` template tag can be clearer. That is acceptable and stays inside `db`.

## Revisit when

Drizzle 1.0 is stable, or a migration needs ordering or data backfills that the generator cannot express cleanly.
