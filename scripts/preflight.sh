#!/usr/bin/env bash
# Fails fast with an actionable message instead of a Docker socket stack trace.
set -euo pipefail
cd "$(dirname "$0")/.."

MIN_NODE_MAJOR=$(cut -d. -f1 .node-version)
readonly MIN_NODE_MAJOR

fail() {
  printf 'preflight: %s\n' "$1" >&2
  exit 1
}

command -v docker >/dev/null || fail "docker is not installed."
docker info >/dev/null 2>&1 || fail "the Docker daemon is not running. Start Docker Desktop or run 'colima start'."

node_major=$(node -p 'process.versions.node.split(".")[0]')
((node_major >= MIN_NODE_MAJOR)) || fail "Node ${MIN_NODE_MAJOR}+ is required, found $(node -v)."
