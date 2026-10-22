# HealthMate

Read `docs/technical/architecture.md` before writing code. It is the source of truth for layout, layers, dependency rules and agent restrictions. `docs/product.md` defines what HealthMate is and how it behaves, `docs/roadmap.md` tracks releases, and each `docs/releases/vX.md` holds that release's plan. A task checks its box in the release file in the same change that makes it true.

Use pnpm only. Docker must be running. `pnpm stack:up` starts local Supabase and writes `.env.local`, `pnpm db:migrate` applies pending migrations, and `pnpm db:seed` loads synthetic demo users. Verify with `pnpm verify`.

Schema lives in `packages/db/src/schema.ts`. After changing it, run `pnpm db:generate`, which writes SQL into `supabase/migrations`, and commit the result. Update `docs/technical/data-schema.dbml` in the same change. Never edit a migration that has been applied anywhere. Do not run `pnpm db:reset` unless the task asks for it, because it wipes the local database.

Docs in `docs/` and this file follow ASD-STE100 at 80%. Sentences have a maximum of 25 words, use active voice, use no "should", "could", "would", "may" or "might", and use approved words. Prose has no em dash, no colon and no adjective without a number. Check a doc with `~/.claude/skills/explainer/ste_check.py` after converting it to HTML.
