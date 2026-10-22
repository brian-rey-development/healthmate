# @healthmate/database

Read `docs/technical/data-schema.dbml` before a change to a table. The rules below apply to every file in this package. A new file follows the file next to it.

## Layout

- One folder for each module. The folder holds the tables, the repositories and the tests of that module.
- A table file is `<table>.table.ts`. A repository file is `<table>.repository.ts`. A mapper that more than 1 repository uses is `<thing>.mapper.ts`, for example `entries/entry.mapper.ts`. A view is `views/<view>.view.ts`, with its repository next to it.
- `src/schema.ts` exports every enum, table and view. Drizzle Kit and the client read it. A table that is not in it gets no migration.
- `src/index.ts` is the public API. It exports the client, `createRepositories`, `inTransaction` and the `Repositories` type. Domain types come from `@healthmate/core`. It never exports a table, an enum value or a file from `test-utils.ts`.

## Tables

- Use camelCase for TypeScript names. The client and Drizzle Kit set `casing: 'snake_case'`, so a column needs no name string.
- Give every constraint and index an explicit name in snake_case, in the form `<table>_<columns or rule>_<idx|unique|fk>`. A check name says the rule, for example `entries_end_after_start`.
- Call `.enableRLS()` on every table. ADR-003 explains the policy.
- An id is a `uuid` from `IdGenerator` in `core`, with no database default. A tool_use id from the model API is `text`, because the model makes it.
- A time is `timestamp({ withTimezone: true })`, with no database default, because the time comes from `Clock` in `core`.
- A date is `date({ mode: 'string' })`, because a JS `Date` moves a date-only value across time zones.
- A `jsonb` column gets a type with `$type<...>()`. The zod schema at the boundary checks the value.
- A rule that the database can check is a `check()`. A rule that needs other rows belongs in `core`.
- An index exists only for a query in a repository, or for a constraint. The DBML note of the index names the repository operation that it serves. Drop an index when that operation goes.
- The columns of an index follow the query, equality columns first, then the `ORDER BY` columns in the same order. For example `findLatest(userId, channel)` needs `(user_id, channel, created_at)`.
- A sort ends with a unique key, for example `ORDER BY created_at, id`. Ids are UUIDv7, so `id` breaks a tie in time order.
- A column has no database default when the domain sets the value, for example `version`. A default hides a missing value.
- A `pgEnum` takes its values from the const array in `core`, for example `KINDS`, so a new domain value makes a migration.
- A view uses `.with({ securityInvoker: true })`, so it applies the RLS of its tables. A view has no `ORDER BY`.

## Repositories

- A repository is `create<Name>Repository(db: Executor)` and returns the `core` port that it implements, for example `EntriesRepository`. `Executor` is the database or a transaction, so the same code runs inside `inTransaction`.
- Each operation is a top-level curried function typed by its port, `const findById = (db: Executor): EntriesRepository['findById'] => async (...) => ...`. The factory only puts the operations together.
- The keys of `Repositories` are the dependency names of the `core` use cases, so the api passes them in unchanged.
- The port sets the verbs and the arguments. `findById` and `find<Thing>` return one domain value or `undefined`. `list<Thing>` returns an array. `insert` writes one row. `insertMany` writes many rows. A state change has its own verb, for example `correct`.
- The first argument of an operation on user data is `userId`, and every read filters on it. If an operation has more than 2 arguments, it takes 1 object instead. `users.findById` takes the user id itself.
- A repository maps a row to a domain value before it returns it. A mapper reads back every value that it writes, and a round-trip test proves it. A mapper throws on a row that breaks a domain rule, because only a bug or a manual edit writes one.
- `onConflictDoNothing` names its `target`, so only the expected conflict returns `false`. A duplicate primary key is a bug and throws. A partial unique index needs `targetWhere`, or a comment that says why the target is missing.
- The repository sets the next `version` with `sql\`${table.version} + 1\`` and matches the expected version in `WHERE`. It does not trust a version from the caller.
- An operation that lists rows takes the `limit` from its port and applies it in SQL.
- A `sql` template is the last choice. Use a Drizzle helper when one exists, for example `isNull()` instead of `is not distinct from null`.
- Use `first(rows)` for zero or one row and `single(rows)` for exactly one row. A conditional write uses `returning()` with `wroteRow(rows)`. It returns `false` when no row matched, for example a stale `version` or a duplicate name. It never throws for an expected case.
- A filter on a partial index uses a literal SQL value, not a bind parameter. A generic prepared plan cannot use the partial index with a parameter.
- A proposal is a message, so no table stores proposals or tool calls. An entry points to its source message and tool_use id.
- No repository deletes a row. `entry_history` has no write operation, because only the trigger writes it.

## Client

- `createDb(url, options)` sets `max`, `idle_timeout`, `connect_timeout` and `prepare`. Use `prepare: false` for a pooled Supabase URL on port 6543, because the transaction pooler drops prepared statements.
- Tests use `max: 2`, because each test file opens its own pool and local Postgres allows 100 connections.
- `close()` calls `client.end({ timeout: 5 })`, so a stuck query cannot block the process exit.
- The app connects as the table owner, which bypasses RLS. So every read of user data filters on `userId` in the repository, and a test proves it with a second user.

## Migrations

- `pnpm db:generate` writes the SQL. Read the SQL before you apply it.
- An extension, a trigger or a function goes in a custom migration from `pnpm --filter @healthmate/database exec drizzle-kit generate --custom --name <name>`.
- Never edit a migration that has run anywhere. A fix is a new migration.
- Before the first apply to the hosted project, squash the local migrations into 1 clean migration. After that apply, a migration is never edited or deleted.
- A migration name is a verb and a noun, for example `add_entry_source` or `drop_tool_calls`.
- A function sets `search_path = ''` and qualifies every name with its schema. A trigger function that writes a table with RLS is `SECURITY DEFINER`, and `PUBLIC`, `anon` and `authenticated` get no `EXECUTE` on it.
- A new column with `NOT NULL` on a table with rows needs a default or a backfill in the same migration.
- Read the generated SQL for `DROP ... CASCADE` and for a drop that comes after an add. Reorder by hand before the first apply.

## Tests

- Every repository has a `<table>.repository.test.ts` next to it. The tests run against the local Supabase stack.
- Every test runs inside `inRollback`, so it leaves no rows. Use `expectViolation` with a `PG_ERROR` code to test a constraint. It runs the write in a savepoint.
- Make test data with the `seed*` helpers in `test-utils.ts`. Add a helper there when 2 test files need the same data.
- A test of a database rule that the domain cannot break, for example a check, inserts into the table directly with `tx`.
- The name of a test says the behavior that it checks. A test checks one behavior. Use `it.each` for a list of rules.
- Test each user filter with a second user who gets nothing back. That includes every `find`, `list` and conditional write.
- Prove that a mapper is lossless with a round trip. Insert a domain value, read it back, and compare with `toEqual`. Use values that the column can change, for example a time without seconds.
- Seed rows that need an order with different timestamps, for example `CREATED_AT` and `LATER`, and insert them out of order.
- Make a branded value with its `create<Value>` function, not with `as`.
