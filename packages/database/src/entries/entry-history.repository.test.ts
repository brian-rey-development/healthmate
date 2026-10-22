import { randomUUID } from 'node:crypto';
import type { EntrySource, NoteEntry } from '@healthmate/core';
import { afterAll, describe, expect, it } from 'vitest';
import {
  connectTestDb,
  CREATED_AT,
  inRollback,
  LATER,
  seedEntrySource,
  seedNote,
  seedUser,
  type TestContext,
} from '../test-utils';

const { db, close } = connectTestDb();
afterAll(close);

const THIRD_AT = new Date('2026-01-03T09:00:00Z');
const LIST_LIMIT = 10;

const correctNote = async (ctx: TestContext, note: NoteEntry, source: EntrySource, updatedAt: Date) => {
  const next = { ...note, version: note.version + 1, source };
  await ctx.repos.entries.correct({ entry: next, updatedAt });
  return next;
};

const seedThreeVersions = async (ctx: TestContext, userId: string) => {
  const first = await seedNote(ctx, userId);
  const second = await correctNote(ctx, first, await seedEntrySource(ctx, userId), LATER);
  const third = await correctNote(ctx, second, await seedEntrySource(ctx, userId), THIRD_AT);
  return { first, second, third };
};

describe('entry history repository', () => {
  it('lists the versions newest first with the time each one was recorded', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { first, second, third } = await seedThreeVersions(ctx, userId);

      expect(await ctx.repos.entryHistory.listVersions(userId, first.id, LIST_LIMIT)).toEqual([
        { ...third, recordedAt: THIRD_AT },
        { ...second, recordedAt: LATER },
        { ...first, recordedAt: CREATED_AT },
      ]);
    }));

  it('copies the first version into history when the entry is inserted', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const entry = await seedNote(ctx, userId);

      expect(await ctx.repos.entryHistory.listVersions(userId, entry.id, LIST_LIMIT)).toEqual([
        { ...entry, recordedAt: CREATED_AT },
      ]);
    }));

  it('returns at most the limit, keeping the newest versions', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { first, third } = await seedThreeVersions(ctx, userId);

      const versions = await ctx.repos.entryHistory.listVersions(userId, first.id, 1);
      expect(versions).toEqual([{ ...third, recordedAt: THIRD_AT }]);
    }));

  it.each([0, -1, 1.5])('rejects the limit %s', (limit) =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);

      await expect(ctx.repos.entryHistory.listVersions(userId, randomUUID(), limit)).rejects.toThrow(RangeError);
    }),
  );

  it('lists nothing for another user', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      const { first } = await seedThreeVersions(ctx, userId);

      expect(await ctx.repos.entryHistory.listVersions(otherId, first.id, LIST_LIMIT)).toEqual([]);
    }));

  it('finds one version of an entry', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { first, second } = await seedThreeVersions(ctx, userId);

      const found = await ctx.repos.entryHistory.findVersion({ userId, entryId: first.id, version: 2 });
      expect(found).toEqual({ ...second, recordedAt: LATER });
    }));

  it('finds nothing for a version that does not exist', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { first } = await seedThreeVersions(ctx, userId);

      expect(await ctx.repos.entryHistory.findVersion({ userId, entryId: first.id, version: 4 })).toBeUndefined();
    }));

  it('finds no version for another user', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      const { first } = await seedThreeVersions(ctx, userId);

      const key = { userId: otherId, entryId: first.id, version: 1 };
      expect(await ctx.repos.entryHistory.findVersion(key)).toBeUndefined();
    }));
});
