import type { PgDatabase } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import type * as schema from './schema';

// Both the database and a transaction satisfy this type, so one repository serves both.
export type Executor = PgDatabase<PostgresJsQueryResultHKT, typeof schema>;
