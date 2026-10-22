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
const SEARCH_LIMIT = 50;

const searchTagged = async (ctx: TestContext, userId: string, query: string, limit = SEARCH_LIMIT): Promise<string[]> => {
  const found = await ctx.repos.subjects.search({ userId, kind: 'symptom', query, limit });
  return found.map((subject) => subject.name).filter((name) => name.includes(TAG));
};

describe('subjects repository', () => {
  it('finds a subject by id as it was inserted', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const subject = await seedSubject(ctx, { userId, name: tagged('Headache') });

      expect(await ctx.repos.subjects.findById(userId, subject.id)).toEqual(subject);
    }));

  it('finds a seed subject by id for any user', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const subject = await seedSubject(ctx, { userId: null, name: tagged('Headache') });

      expect(await ctx.repos.subjects.findById(userId, subject.id)).toEqual(subject);
    }));

  it('does not find the subject of another user by id', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      const hidden = await seedSubject(ctx, { userId: otherId, name: tagged('Head rush') });

      expect(await ctx.repos.subjects.findById(userId, hidden.id)).toBeUndefined();
    }));

  it('searches seed rows and own rows', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      await seedSubject(ctx, { userId: null, name: tagged('Headache') });
      await seedSubject(ctx, { userId, name: tagged('Head pressure') });

      expect(await searchTagged(ctx, userId, 'head')).toEqual([tagged('Head pressure'), tagged('Headache')]);
    }));

  it('does not search the rows of another user', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      await seedSubject(ctx, { userId: otherId, name: tagged('Head rush') });

      expect(await searchTagged(ctx, userId, 'head')).toEqual([]);
    }));

  it('ranks an exact name, then a prefix, then a substring', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const exact = `ache ${TAG}`;
      await seedSubject(ctx, { userId, name: `Back ${exact}` });
      await seedSubject(ctx, { userId, name: `${exact} deep` });
      await seedSubject(ctx, { userId, name: exact });

      expect(await searchTagged(ctx, userId, exact)).toEqual([exact, `${exact} deep`, `Back ${exact}`]);
    }));

  it('breaks a tie of the same name by id', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const seed = await seedSubject(ctx, { userId: null, name: tagged('Cramp') });
      const own = await seedSubject(ctx, { userId, name: tagged('Cramp') });

      const found = await ctx.repos.subjects.search({ userId, kind: 'symptom', query: tagged('Cramp'), limit: SEARCH_LIMIT });
      expect(found.map((subject) => subject.id)).toEqual([seed.id, own.id].sort());
    }));

  it('returns at most the limit', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      await seedSubject(ctx, { userId, name: tagged('Ache A') });
      await seedSubject(ctx, { userId, name: tagged('Ache B') });

      expect(await searchTagged(ctx, userId, tagged('Ache'), 1)).toHaveLength(1);
    }));

  it.each([0, -1, 1.5])('rejects the limit %s', (limit) =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);

      await expect(ctx.repos.subjects.search({ userId, kind: 'symptom', query: 'a', limit })).rejects.toThrow(RangeError);
    }),
  );

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

  it('allows a private name that a seed row already has', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      await seedSubject(ctx, { userId: null, name: tagged('Nausea') });

      const own = { id: randomUUID(), userId, kind: 'symptom', name: tagged('Nausea') } as const;
      expect(await ctx.repos.subjects.insert(own, CREATED_AT)).toBe(true);
    }));

  it('throws when the id already exists', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const subject = await seedSubject(ctx, { userId, name: tagged('Nausea') });

      await expectViolation(ctx, PG_ERROR.uniqueViolation, ({ repos }) =>
        repos.subjects.insert({ ...subject, name: tagged('Other') }, CREATED_AT),
      );
    }));

  it('rejects a subject of kind note', () =>
    inRollback(db, async (ctx) => {
      const note = { id: randomUUID(), kind: 'note', name: tagged('Note'), createdAt: CREATED_AT } as const;

      await expectViolation(ctx, PG_ERROR.checkViolation, ({ tx }) => tx.insert(subjects).values(note));
    }));
});
