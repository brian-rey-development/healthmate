import { randomUUID } from 'node:crypto';
import { eq, sql, TransactionRollbackError } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { createDb } from './client';
import { loadLocalEnv, requireEnv } from './env';
import { assertLocalTarget } from './guard';
import { users, type UserRow } from './schema';

loadLocalEnv();
const url = requireEnv('DATABASE_URL');
assertLocalTarget(url);

const { db, close } = createDb(url);
afterAll(close);

describe('users table', () => {
  it('round-trips a row linked to an auth user, then rolls back', async () => {
    const row = { id: randomUUID(), displayName: 'Synthetic Sam', createdAt: new Date('2026-01-01T00:00:00Z') };
    let found: UserRow | undefined;
    const run = db.transaction(async (tx) => {
      await tx.execute(sql`insert into auth.users (id) values (${row.id})`);
      await tx.insert(users).values(row);
      [found] = await tx.select().from(users).where(eq(users.id, row.id));
      tx.rollback();
    });
    await expect(run).rejects.toBeInstanceOf(TransactionRollbackError);
    expect(found).toEqual(row);
  });

  it('rejects a row without a matching auth user', async () => {
    const row = { id: randomUUID(), displayName: 'Orphan', createdAt: new Date('2026-01-01T00:00:00Z') };
    await expect(db.insert(users).values(row)).rejects.toThrow();
  });
});

describe('assertLocalTarget', () => {
  it('accepts the local stack', () => {
    expect(() => assertLocalTarget('postgresql://postgres:postgres@127.0.0.1:54322/postgres')).not.toThrow();
  });

  it('rejects a hosted project', () => {
    expect(() => assertLocalTarget('postgresql://postgres:x@db.abcd.supabase.co:5432/postgres')).toThrow(/Refusing/);
  });
});
