#!/usr/bin/env bash
# Rebuilds the local database from supabase/migrations, then loads synthetic demo data.
set -euo pipefail
cd "$(dirname "$0")/.."

scripts/preflight.sh
pnpm exec supabase db reset --local
pnpm --filter @healthmate/db db:seed
