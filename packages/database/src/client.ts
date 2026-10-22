import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const DEFAULT_MAX_CONNECTIONS = 10;
const IDLE_TIMEOUT_SECONDS = 20;
const CONNECT_TIMEOUT_SECONDS = 10;
const STATEMENT_TIMEOUT_MS = 30_000;
const END_TIMEOUT_SECONDS = 5;

export type DbOptions = { readonly max?: number };

export const createDb = (url: string, { max = DEFAULT_MAX_CONNECTIONS }: DbOptions = {}) => {
  const client = postgres(url, {
    max,
    prepare: false,
    idle_timeout: IDLE_TIMEOUT_SECONDS,
    connect_timeout: CONNECT_TIMEOUT_SECONDS,
    connection: { statement_timeout: STATEMENT_TIMEOUT_MS },
  });
  const db = drizzle({ client, schema, casing: 'snake_case' });
  return { db, close: () => client.end({ timeout: END_TIMEOUT_SECONDS }) };
};

export type Database = ReturnType<typeof createDb>['db'];
