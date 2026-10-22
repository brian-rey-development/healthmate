import { defineConfig } from 'drizzle-kit';
import { loadLocalEnv, requireEnv } from './src/env';

loadLocalEnv();

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: '../../supabase/migrations',
  migrations: { prefix: 'supabase' },
  schemaFilter: ['public'],
  casing: 'snake_case',
  dbCredentials: { url: requireEnv('DATABASE_URL') },
  strict: true,
  verbose: true,
});
