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
import { subjects } from './subjects.table';

const { db, close } = connectTestDb();
afterAll(close);

// A random suffix keeps the test rows apart from seed rows that exist in the database.
const TAG = randomUUID().slice(0, 8);
const tagged = (name: string): string => `${name} ${TAG}`;

const searchTagged = async (ctx: TestContext, userId: string, query: string): Promise<string[]> => {
  const found = await ctx.repos.subjects.search({ userId, kind: 'symptom', query, limit: 50 });
  return found.map((subject) => subject.name).filter((name) => name.endsWith(TAG));
};

describe('subjects repository', () => {
  it('finds a subject by id as it was inserted', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const subject = await seedSubject(ctx, { userId, name: tagged('Headache') });

      expect(await ctx.repos.subjects.findById(userId, subject.id)).toEqual(subject);
    }));

  it('finds seed rows and own rows, but not the rows of another user', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      await seedSubject(ctx, { userId: null, name: tagged('Headache') });
      await seedSubject(ctx, { userId, name: tagged('Head pressure') });
      const hidden = await seedSubject(ctx, { userId: otherId, name: tagged('Head rush') });

      const names = await searchTagged(ctx, userId, 'head');
      expect(names.sort()).toEqual([tagged('Head pressure'), tagged('Headache')]);
      expect(await ctx.repos.subjects.findById(userId, hidden.id)).toBeUndefined();
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

  it.each([
    ['a seed name', null],
    ['a private name', 'owner'],
  ] as const)('refuses %s that already exists, in any case', (_name, owner) =>
    inRollback(db, async (ctx) => {
      const userId = owner && (await seedUser(ctx));
      await seedSubject(ctx, { userId, name: tagged('Nausea') });

      const duplicate = { id: randomUUID(), userId, kind: 'symptom', name: tagged('NAUSEA') } as const;
      expect(await ctx.repos.subjects.insert(duplicate, CREATED_AT)).toBe(false);
    }),
  );

  it('rejects a subject of kind note', () =>
    inRollback(db, async (ctx) => {
      const note = { id: randomUUID(), kind: 'note', name: tagged('Note'), createdAt: CREATED_AT } as const;

      await expectViolation(ctx, PG_ERROR.checkViolation, ({ tx }) => tx.insert(subjects).values(note));
    }));
});
