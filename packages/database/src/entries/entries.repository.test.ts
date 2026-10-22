import { randomUUID } from 'node:crypto';
import { getTableColumns } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import {
  connectTestDb,
  CREATED_AT,
  expectViolation,
  inRollback,
  LATER,
  noteEntry,
  PG_ERROR,
  seedEntry,
  seedSubject,
  seedToolCall,
  seedUser,
  type PgErrorCode,
  type TestContext,
} from '../test-utils';
import { entries, type NewEntryRow } from './entries.table';
import { entryHistory } from './entry-history.table';

const { db, close } = connectTestDb();
afterAll(close);

const ENTRY_ONLY_COLUMNS = ['id', 'createdAt', 'updatedAt'];
const HISTORY_ONLY_COLUMNS = ['entryId', 'recordedAt'];

const seedHeadache = async (ctx: TestContext, userId: string) => {
  const subject = await seedSubject(ctx, { userId, name: 'Headache' });
  return seedEntry(ctx, userId, {
    subjectId: subject.id,
    kind: 'symptom',
    value: { severity: 6 },
    originalWords: 'bad headache since this morning',
    startTime: '08:30:00',
  });
};

const correctSeverity = (ctx: TestContext, userId: string, id: string, toolCallId: string) =>
  ctx.repos.entries.correct({
    userId,
    id,
    expectedVersion: 1,
    toolCallId,
    updatedAt: LATER,
    changes: { value: { severity: 4 } },
  });

describe('entries repository', () => {
  it('keeps the data columns of entries and entry_history the same, so the trigger copies all of them', () => {
    const dataColumns = (columns: string[], only: string[]) => columns.filter((name) => !only.includes(name)).sort();

    expect(dataColumns(Object.keys(getTableColumns(entryHistory)), HISTORY_ONLY_COLUMNS)).toEqual(
      dataColumns(Object.keys(getTableColumns(entries)), ENTRY_ONLY_COLUMNS),
    );
  });

  it('copies the first version into history with the time of the row', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);

      expect(entry).toMatchObject({ version: 1, startDate: '2026-01-01', value: { severity: 6 } });
      expect(await ctx.repos.entryHistory.listVersions(userId, entry.id)).toEqual([
        expect.objectContaining({ version: 1, toolCallId: entry.toolCallId, recordedAt: CREATED_AT }),
      ]);
    }));

  it('adds a version for each correction and keeps the old version', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);
      const correction = await seedToolCall(ctx, userId);

      const corrected = await correctSeverity(ctx, userId, entry.id, correction.id);

      expect(corrected).toMatchObject({ version: 2, value: { severity: 4 }, createdAt: CREATED_AT, updatedAt: LATER });
      const old = await ctx.repos.entryHistory.findVersion({ userId, entryId: entry.id, version: 1 });
      expect(old?.value).toEqual({ severity: 6 });
      expect(await ctx.repos.entryHistory.findVersion({ userId, entryId: entry.id, version: 3 })).toBeUndefined();
    }));

  it('refuses a correction based on a stale version', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);
      const first = await seedToolCall(ctx, userId);
      const second = await seedToolCall(ctx, userId);

      expect(await correctSeverity(ctx, userId, entry.id, first.id)).toBeDefined();
      expect(await correctSeverity(ctx, userId, entry.id, second.id)).toBeUndefined();
      expect(await ctx.repos.entryHistory.listVersions(userId, entry.id)).toHaveLength(2);
    }));

  it('refuses a second version from the same tool call', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);

      await expectViolation(ctx, PG_ERROR.uniqueViolation, (repos) =>
        correctSeverity({ ...ctx, repos }, userId, entry.id, entry.toolCallId),
      );
    }));

  it('does not let another user read or correct the entry', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);
      const toolCall = await seedToolCall(ctx, otherId);

      expect(await ctx.repos.entries.findById(otherId, entry.id)).toBeUndefined();
      expect(await correctSeverity(ctx, otherId, entry.id, toolCall.id)).toBeUndefined();
      expect(await ctx.repos.entries.findById(userId, entry.id)).toMatchObject({ version: 1, value: { severity: 6 } });
    }));
});

const INVALID_ROWS: readonly [string, Partial<NewEntryRow>, PgErrorCode][] = [
  ['a start time without day precision', { startTime: '08:00:00', startPrecision: 'month' }, PG_ERROR.checkViolation],
  ['an end time without an end date', { endTime: '10:00:00' }, PG_ERROR.checkViolation],
  ['an end date before the start date', { endDate: '2025-12-31' }, PG_ERROR.checkViolation],
  ['a note with a subject', { subjectId: randomUUID() }, PG_ERROR.checkViolation],
  ['a symptom without a subject', { kind: 'symptom', value: { severity: 1 } }, PG_ERROR.checkViolation],
  ['a symptom with an unknown subject', { kind: 'symptom', subjectId: randomUUID() }, PG_ERROR.foreignKeyViolation],
];

describe('entries rules', () => {
  it.each(INVALID_ROWS)('rejects %s', (_name, overrides, code) =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const toolCall = await seedToolCall(ctx, userId);

      await expectViolation(ctx, code, (repos) =>
        repos.entries.insert(noteEntry(userId, toolCall.id, overrides)),
      );
    }),
  );
});
