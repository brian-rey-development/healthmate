import { afterAll, describe, expect, it } from 'vitest';
import { connectTestDb, inRollback, seedEntry, seedSubject, seedUser } from '../test-utils';

const { db, close } = connectTestDb();
afterAll(close);

const JANUARY = { from: '2026-01-01', to: '2026-01-31' };

describe('timeline entries repository', () => {
  it('lists the entries of one user that start in the range, newest first, with the subject name', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      const subject = await seedSubject(ctx, { userId, name: 'Back pain' });
      const older = await seedEntry(ctx, userId, {
        startDate: '2026-01-02',
        kind: 'symptom',
        subjectId: subject.id,
        value: { severity: 5 },
      });
      const newer = await seedEntry(ctx, userId, { startDate: '2026-01-05' });
      await seedEntry(ctx, userId, { startDate: '2026-02-01' });
      await seedEntry(ctx, otherId, { startDate: '2026-01-03' });

      const rows = await ctx.repos.timelineEntries.listStartingBetween({ userId, ...JANUARY });
      expect(rows.map((row) => [row.id, row.subjectName])).toEqual([
        [newer.id, null],
        [older.id, 'Back pain'],
      ]);
    }));
});
