import { afterAll, describe, expect, it } from 'vitest';
import {
  connectTestDb,
  inRollback,
  noteEntry,
  seedEntry,
  seedNote,
  seedProposal,
  seedSubject,
  seedUser,
  symptomEntry,
} from '../test-utils';

const { db, close } = connectTestDb();
afterAll(close);

const JANUARY = { from: '2026-01-01', to: '2026-01-31' };
const onDay = (date: string) => ({ start: { date, precision: 'day' } }) as const;

describe('timeline repository', () => {
  it('lists the entries of one user that start in the range, newest first, with the subject name', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      const subject = await seedSubject(ctx, { userId, name: 'Back pain' });
      const note = noteEntry(userId, await seedProposal(ctx, userId), onDay('2026-01-02'));
      const older = await seedEntry(ctx, symptomEntry(note, subject));
      const newer = await seedNote(ctx, userId, onDay('2026-01-05'));
      await seedNote(ctx, userId, onDay('2026-02-01'));
      await seedNote(ctx, otherId, onDay('2026-01-03'));

      expect(await ctx.repos.timeline.listStartingBetween({ userId, ...JANUARY })).toEqual([
        { ...newer, subjectName: null },
        { ...older, subjectName: 'Back pain' },
      ]);
    }));
});
