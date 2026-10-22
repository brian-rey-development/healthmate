import { afterAll, describe, expect, it } from 'vitest';
import {
  buildNote,
  buildSymptom,
  connectTestDb,
  inRollback,
  seedEntry,
  seedEntrySource,
  seedNote,
  seedSubject,
  seedUser,
  type TestContext,
} from '../test-utils';

const { db, close } = connectTestDb();
afterAll(close);

const JANUARY = { from: '2026-01-01', to: '2026-01-31' };
const LIST_LIMIT = 50;
const onDay = (date: string) => ({ start: { date, precision: 'day' } }) as const;

const list = (ctx: TestContext, userId: string, range = JANUARY, limit = LIST_LIMIT) =>
  ctx.repos.timeline.listStartingBetween({ userId, ...range, limit });

describe('timeline repository', () => {
  it('lists the entries that start in the range, newest start date first', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const older = await seedNote(ctx, userId, onDay('2026-01-02'));
      const newer = await seedNote(ctx, userId, onDay('2026-01-05'));

      expect(await list(ctx, userId)).toEqual([
        { ...newer, subjectName: null },
        { ...older, subjectName: null },
      ]);
    }));

  it('gives a symptom the name of its subject', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const subject = await seedSubject(ctx, { userId, name: 'Back pain' });
      const note = buildNote(userId, await seedEntrySource(ctx, userId));
      const symptom = await seedEntry(ctx, buildSymptom(note, subject));

      expect(await list(ctx, userId)).toEqual([{ ...symptom, subjectName: 'Back pain' }]);
    }));

  it('gives a symptom the name of a seed subject', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const subject = await seedSubject(ctx, { userId: null, name: 'Seed pain' });
      const note = buildNote(userId, await seedEntrySource(ctx, userId));
      const symptom = await seedEntry(ctx, buildSymptom(note, subject));

      expect(await list(ctx, userId)).toEqual([{ ...symptom, subjectName: 'Seed pain' }]);
    }));

  it.each([
    ['before the range', '2025-12-31'],
    ['after the range', '2026-02-01'],
  ])('leaves out an entry %s', (_name, date) =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      await seedNote(ctx, userId, onDay(date));

      expect(await list(ctx, userId)).toEqual([]);
    }),
  );

  it.each([
    ['first', '2026-01-01'],
    ['last', '2026-01-31'],
  ])('includes an entry on the %s day of the range', (_name, date) =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const entry = await seedNote(ctx, userId, onDay(date));

      expect(await list(ctx, userId)).toEqual([{ ...entry, subjectName: null }]);
    }),
  );

  it('lists nothing for another user', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      await seedNote(ctx, userId, onDay('2026-01-03'));

      expect(await list(ctx, otherId)).toEqual([]);
    }));

  it('breaks a tie of the same start date by id', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const first = await seedNote(ctx, userId, onDay('2026-01-03'));
      const second = await seedNote(ctx, userId, onDay('2026-01-03'));

      const items = await list(ctx, userId);
      expect(items.map((item) => item.id)).toEqual([first.id, second.id].sort());
    }));

  it('returns the newest entries up to the limit', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      await seedNote(ctx, userId, onDay('2026-01-02'));
      const newer = await seedNote(ctx, userId, onDay('2026-01-05'));

      expect(await list(ctx, userId, JANUARY, 1)).toEqual([{ ...newer, subjectName: null }]);
    }));

  it.each([0, -1, 1.5])('rejects the limit %s', (limit) =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);

      await expect(list(ctx, userId, JANUARY, limit)).rejects.toThrow(RangeError);
    }),
  );
});
