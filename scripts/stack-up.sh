#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

scripts/preflight.sh
pnpm exec supabase start
scripts/write-env.sh
