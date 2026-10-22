# ADR-003 Supabase for Postgres and Auth

Accepted on 2026-10-22. Supersedes the Compose Postgres from ADR-001 and amends ADR-002 on where migrations live and which tool applies them.

## Context

HealthMate needs login for the Telegram and mobile channels. Supabase Auth gives email, OAuth and MFA flows. Without it, these flows need custom code. Auth stores identities in the `auth` schema of a single database called `postgres`. This conflicts with the original rule of two databases on one server, `healthmate_demo` and `healthmate_personal`. App tables can reference `auth.users` only from the same database.

Running a separate Compose Postgres for app data next to the Supabase Postgres was rejected. It doubles the local footprint, removes the foreign key from profiles to identities, and leaves row level security unusable for app tables.

## Decision

The Supabase Postgres is the only Postgres. The local Supabase stack is the demo environment. Personal data will live in a separate hosted Supabase project, so each environment holds one kind of data. Tests, seeds and evals refuse any connection whose host is not loopback, which replaces the database-name check that a single `postgres` database made meaningless.

The Supabase CLI is pinned as an exact root devDependency, `supabase@2.121.0`, so every machine and CI run the same stack. Scripts call `pnpm exec supabase` and never a globally installed binary. Realtime, Storage, Edge Functions and Analytics are disabled in `supabase/config.toml` because nothing uses them, which shortens start time and shrinks the attack surface. The stack uses host ports 56320 to 56329, so it runs next to other local Supabase projects that keep the 543xx defaults.

Drizzle stays the schema source. Drizzle Kit writes migrations into `supabase/migrations` with the `supabase` timestamp prefix. Only the Supabase CLI applies them, with `migration up` locally and `db push` for the hosted project. There is one migration ledger, `supabase_migrations.schema_migrations`. The initial migration was regenerated in this layout. That was safe only because the earlier `0000_init` had run on a throwaway local volume and was never committed.

App tables live in `public`. PostgREST does not expose `public`, so the publishable key that ships inside clients cannot read app data through the auto-generated REST API. Every app table also has row level security enabled with no policies, which denies access by default if `public` is ever exposed by mistake. `apps/api` connects as the table owner and goes through `core`, so it is unaffected by either layer.

`public.users` is the HealthMate profile for an identity. Its `id` is the `auth.users` id, with `ON DELETE RESTRICT`, so deleting an identity cannot silently remove a profile and its history. No trigger creates profiles on signup, because a trigger is a writer outside `core`. A use case creates the profile instead.

Seeds create synthetic demo users through the Auth admin API with `@supabase/supabase-js`, a devDependency of `database`. Seeds never insert rows into `auth.users` directly, because Auth's internal tables change between versions. Seeds use fixed ids and emails, so running them twice changes nothing.

`.env.local` is generated from `supabase status` by `scripts/write-env.sh`. `.env` is reserved for user overrides, loads first and wins.

## Consequences

One `pnpm stack:up` starts Postgres 17, Auth, the API gateway, Studio and a mail catcher, and writes the connection settings. `supabase db reset` rebuilds the local database from migrations, and `pnpm db:reset` follows it with the seed.

The demo and personal environments no longer share a server, so a mistyped connection string cannot reach personal data from a local test. The cost is that personal data needs a hosted project before it exists, which matches v0.1 using synthetic data only.

The Supabase secret key bypasses row level security and must stay inside `apps/api` and local tooling. Channels and clients only ever receive the publishable key.

## Open question

Mobile login through `@supabase/supabase-js` makes `apps/mobile` import a package other than `contracts`, and the dependency rules forbid this. Before step 12, choose one option. Either `contracts` gets a thin auth client that wraps the Supabase calls, or the rule changes to allow the Supabase client in `mobile`.

## Revisit when

The hosted personal project is created, which needs its own runbook for `db push` and secret handling. A second Supabase feature such as Storage is needed, which reopens `config.toml`. The Supabase CLI ships a major version.
