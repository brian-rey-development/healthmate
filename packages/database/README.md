# @healthmate/database

Postgres access for HealthMate. This package holds the Drizzle schema, the repositories that implement the `core` ports, and the synthetic seeds.

## Data model

The design of the data model is in [`docs/technical/data-schema.dbml`](../../docs/technical/data-schema.dbml). It gives each table, each column and the reason for each rule. Paste the file into [dbdiagram.io](https://dbdiagram.io) to see the diagram.

The `*.table.ts` files are the source of truth for code. The DBML file is the design. Change both in the same commit.

## Layout

Each module folder holds its tables, its repositories and their tests. A table file ends in `.table.ts`, a repository file ends in `.repository.ts`, and a view file in `src/views` ends in `.view.ts`.

| Path | Contents |
|---|---|
| `src/users` | `users` |
| `src/subjects` | `subjects` and the trigram search |
| `src/entries` | `entries`, `entry_history` and the columns that the 2 tables share |
| `src/conversations` | `conversations` and `messages`. A proposal is a tool_use block in a message |
| `src/citations` | `citations` |
| `src/views` | `timeline_entries` |
| `src/schema.ts` | Exports every enum, table and view for Drizzle Kit and the client |
| `src/repositories.ts` | `createRepositories` and `inTransaction`, the unit of work |

The rules for tables, repositories and tests are in [`CLAUDE.md`](CLAUDE.md).

## Change the schema

1. Change the `*.table.ts` file. Export a new table from `src/schema.ts`.
2. Update `docs/technical/data-schema.dbml`.
3. Run `pnpm db:generate`. Drizzle Kit writes the SQL into `supabase/migrations`.
4. Run `pnpm db:migrate` to apply the migration to the local stack.
5. Commit the schema, the DBML file and the migration together.

Never edit a migration that has run anywhere. A trigger or an extension goes in a custom SQL migration from `pnpm --filter @healthmate/database exec drizzle-kit generate --custom --name <name>`, because Drizzle Kit does not generate them.

## Commands

| Command | Result |
|---|---|
| `pnpm db:generate` | Writes a migration from the schema |
| `pnpm db:migrate` | Applies pending migrations to the local stack |
| `pnpm db:seed` | Adds the synthetic demo users. A second run changes nothing |
| `pnpm --filter @healthmate/database test` | Runs the integration tests in transactions that roll back |
