import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const WORKSPACE_MARKER = 'pnpm-workspace.yaml';
const ENV_FILES = ['.env', '.env.local'];

// drizzle-kit bundles its config as CommonJS, where import.meta is unavailable, so the root is found from cwd.
const findRepoRoot = (from: string): string => {
  if (existsSync(join(from, WORKSPACE_MARKER))) return from;
  const parent = dirname(from);
  if (parent === from) throw new Error(`No ${WORKSPACE_MARKER} found above ${process.cwd()}`);
  return findRepoRoot(parent);
};

export const loadLocalEnv = (): void => {
  const root = findRepoRoot(process.cwd());
  for (const file of ENV_FILES) {
    const path = join(root, file);
    if (existsSync(path)) process.loadEnvFile(path);
  }
};

export const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Run \`pnpm stack:up\` to generate .env.local.`);
  return value;
};
