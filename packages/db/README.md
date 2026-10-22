# @healthmate/db

Postgres access for HealthMate. This package holds the Drizzle schema, the repositories that implement the `core` ports, and the synthetic seeds.

## Data model

The design of the data model is in [`docs/technical/data-schema.dbml`](../../docs/technical/data-schema.dbml). It gives each table, each column and the reason for each rule. Paste the file into [dbdiagram.io](https://dbdiagram.io) to see the diagram.

`src/schema.ts` is the source of truth for code. The DBML file is the design. Change both in the same commit.

## Change the schema

1. Change `src/schema.ts`.
2. Update `docs/technical/data-schema.dbml`.
3. Run `pnpm db:generate`. Drizzle Kit writes the SQL into `supabase/migrations`.
4. Run `pnpm db:migrate` to apply the migration to the local stack.
5. Commit the schema, the DBML file and the migration together.

Never edit a migration that has run anywhere. A trigger goes in a custom SQL migration, because Drizzle Kit does not generate triggers.

## Commands

| Command | Result |
|---|---|
| `pnpm db:generate` | Writes a migration from the schema |
| `pnpm db:migrate` | Applies pending migrations to the local stack |
| `pnpm db:seed` | Adds the synthetic demo users. A second run changes nothing |
| `pnpm --filter @healthmate/db test` | Runs the integration tests in transactions that roll back |
