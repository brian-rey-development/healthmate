import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import {
  connectTestDb,
  CREATED_AT,
  expectViolation,
  inRollback,
  PG_ERROR,
  seedSubject,
  seedUser,
  type TestContext,
} from '../test-utils';

const { db, close } = connectTestDb();
afterAll(close);

// A random suffix keeps the test rows apart from seed rows that exist in the database.
const TAG = randomUUID().slice(0, 8);
const tagged = (name: string): string => `${name} ${TAG}`;

const searchTagged = async (ctx: TestContext, userId: string, query: string): Promise<string[]> => {
  const rows = await ctx.repos.subjects.search({ userId, kind: 'symptom', query, limit: 50 });
  return rows.map((row) => row.name).filter((name) => name.endsWith(TAG));
};

describe('subjects repository', () => {
  it('finds seed rows and own rows, but not the rows of another user', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      await seedSubject(ctx, { userId: null, name: tagged('Headache') });
      await seedSubject(ctx, { userId, name: tagged('Head pressure') });
      await seedSubject(ctx, { userId: otherId, name: tagged('Head rush') });

      const names = await searchTagged(ctx, userId, 'head');
      expect(names.sort()).toEqual([tagged('Head pressure'), tagged('Headache')]);
    }));

  it('finds a name from a query with a typo', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      await seedSubject(ctx, { userId: null, name: tagged('Headache') });

      expect(await searchTagged(ctx, userId, 'hedache')).toEqual([tagged('Headache')]);
    }));

  it('treats % and _ in the query as plain characters', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      await seedSubject(ctx, { userId: null, name: tagged('Nausea') });

      expect(await searchTagged(ctx, userId, '%')).toEqual([]);
    }));

  it('rejects the same seed name twice, in any case', () =>
    inRollback(db, async (ctx) => {
      await seedSubject(ctx, { userId: null, name: tagged('Nausea') });

      await expectViolation(ctx, PG_ERROR.uniqueViolation, (repos) =>
        seedSubject({ ...ctx, repos }, { userId: null, name: tagged('NAUSEA') }),
      );
    }));

  it('rejects the same private name twice for one user, in any case', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      await seedSubject(ctx, { userId, name: tagged('Nausea') });

      await expectViolation(ctx, PG_ERROR.uniqueViolation, (repos) =>
        seedSubject({ ...ctx, repos }, { userId, name: tagged('nausea') }),
      );
    }));

  it('rejects a subject of kind note', () =>
    inRollback(db, async (ctx) => {
      await expectViolation(ctx, PG_ERROR.checkViolation, (repos) =>
        repos.subjects.insert({
          id: randomUUID(),
          userId: null,
          kind: 'note',
          name: tagged('Note'),
          createdAt: CREATED_AT,
        }),
      );
    }));
});
