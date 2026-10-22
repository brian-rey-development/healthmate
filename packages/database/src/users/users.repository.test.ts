import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { connectTestDb, CREATED_AT, expectViolation, inRollback, PG_ERROR, seedUser } from '../test-utils';

const { db, close } = connectTestDb();
afterAll(close);

describe('users repository', () => {
  it('finds a user linked to an auth user', () =>
    inRollback(db, async (ctx) => {
      const id = await seedUser(ctx);

      expect(await ctx.repos.users.findById(id)).toEqual({ id, displayName: 'Synthetic Sam' });
    }));

  it('finds nothing for an unknown id', () =>
    inRollback(db, async (ctx) => {
      expect(await ctx.repos.users.findById(randomUUID())).toBeUndefined();
    }));

  it('returns false when the same id is inserted twice', () =>
    inRollback(db, async (ctx) => {
      const id = await seedUser(ctx);

      expect(await ctx.repos.users.insert({ id, displayName: 'Other' }, CREATED_AT)).toBe(false);
    }));

  it('keeps the first user when the same id is inserted twice', () =>
    inRollback(db, async (ctx) => {
      const id = await seedUser(ctx);
      await ctx.repos.users.insert({ id, displayName: 'Other' }, CREATED_AT);

      expect(await ctx.repos.users.findById(id)).toMatchObject({ displayName: 'Synthetic Sam' });
    }));

  it('rejects a user without a matching auth user', () =>
    inRollback(db, async (ctx) => {
      await expectViolation(ctx, PG_ERROR.foreignKeyViolation, ({ repos }) =>
        repos.users.insert({ id: randomUUID(), displayName: 'Orphan' }, CREATED_AT),
      );
    }));
});
