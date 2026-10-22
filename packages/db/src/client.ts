import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export const createDb = (url: string) => {
  const client = postgres(url);
  const db = drizzle({ client, schema, casing: 'snake_case' });
  return { db, close: () => client.end() };
};

export type Database = ReturnType<typeof createDb>['db'];
