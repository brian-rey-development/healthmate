import { randomUUID } from 'node:crypto';
import { confirmProposal, correctEntry, type EntrySource, type Severity, type SymptomEntry } from '@healthmate/core';
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
  seedNote,
  seedOpenProposal,
  seedProposal,
  seedSubject,
  seedUser,
  symptomEntry,
  type PgErrorCode,
  type TestContext,
} from '../test-utils';
import { entries, type NewEntryRow } from './entries.table';
import { toStoredEntry } from './entry.mapper';
import { entryHistory } from './entry-history.table';

const { db, close } = connectTestDb();
afterAll(close);

const ENTRY_ONLY_COLUMNS = ['id', 'createdAt', 'updatedAt'];
const HISTORY_ONLY_COLUMNS = ['entryId', 'recordedAt'];

const seedHeadache = async (ctx: TestContext, userId: string): Promise<SymptomEntry> => {
  const subject = await seedSubject(ctx, { userId, name: 'Headache' });
  const note = noteEntry(userId, await seedProposal(ctx, userId), { originalWords: 'headache since 8:30' });
  return seedEntry(ctx, symptomEntry(note, subject, { startTime: '08:30:00', endDate: '2026-01-02', endTime: '10:00:00' }));
};

const nextVersion = (entry: SymptomEntry, source: EntrySource): SymptomEntry => ({
  ...entry,
  version: entry.version + 1,
  severity: 4 as Severity,
  source,
});

const correct = (ctx: TestContext, entry: SymptomEntry, expectedVersion = 1) =>
  ctx.repos.entries.correct({ entry, expectedVersion, updatedAt: LATER });

describe('entries repository', () => {
  it('keeps the data columns of entries and entry_history the same, so the trigger copies all of them', () => {
    const dataColumns = (columns: string[], only: string[]) => columns.filter((name) => !only.includes(name)).sort();

    expect(dataColumns(Object.keys(getTableColumns(entryHistory)), HISTORY_ONLY_COLUMNS)).toEqual(
      dataColumns(Object.keys(getTableColumns(entries)), ENTRY_ONLY_COLUMNS),
    );
  });

  it.each([
    ['a symptom with every time set', seedHeadache],
    ['a note', seedNote],
  ])('reads back %s exactly as it was inserted', (_name, seed) =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const entry = await seed(ctx, userId);

      expect(await ctx.repos.entries.findById(userId, entry.id)).toEqual(entry);
    }),
  );

  it('copies the first version into history with the time of the row', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);

      expect(await ctx.repos.entryHistory.listVersions(userId, entry.id)).toEqual([{ ...entry, recordedAt: CREATED_AT }]);
    }));

  it('writes nothing when the same proposal is confirmed twice', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const source = await seedProposal(ctx, userId);

      expect(await ctx.repos.entries.insert(noteEntry(userId, source), CREATED_AT)).toBe(true);
      expect(await ctx.repos.entries.insert(noteEntry(userId, source), CREATED_AT)).toBe(false);
    }));

  it('writes nothing when a proposal is confirmed again after its entry was corrected', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);
      expect(await correct(ctx, nextVersion(entry, await seedProposal(ctx, userId)))).toBe(true);

      expect(await ctx.repos.entries.insert({ ...entry, id: randomUUID() }, LATER)).toBe(false);
    }));

  it('saves a correction as the next version and keeps the old version', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);
      const corrected = nextVersion(entry, await seedProposal(ctx, userId));

      expect(await correct(ctx, corrected)).toBe(true);
      expect(await ctx.repos.entries.findById(userId, entry.id)).toEqual(corrected);
      const versions = await ctx.repos.entryHistory.listVersions(userId, entry.id);
      expect(versions).toEqual([{ ...entry, recordedAt: CREATED_AT }, { ...corrected, recordedAt: LATER }]);
      expect(await ctx.repos.entryHistory.findVersion({ userId, entryId: entry.id, version: 3 })).toBeUndefined();
    }));

  it('refuses a correction based on a stale version', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);

      expect(await correct(ctx, nextVersion(entry, await seedProposal(ctx, userId)))).toBe(true);
      expect(await correct(ctx, nextVersion(entry, await seedProposal(ctx, userId)))).toBe(false);
      expect(await ctx.repos.entryHistory.listVersions(userId, entry.id)).toHaveLength(2);
    }));

  it('rejects a second version from the same proposal', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);

      await expectViolation(ctx, PG_ERROR.uniqueViolation, (scope) => correct(scope, nextVersion(entry, entry.source)));
    }));

  it('does not let another user read or correct the entry', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);
      const stolen = { ...nextVersion(entry, await seedProposal(ctx, otherId)), userId: otherId };

      expect(await ctx.repos.entries.findById(otherId, entry.id)).toBeUndefined();
      expect(await correct(ctx, stolen)).toBe(false);
      expect(await ctx.repos.entries.findById(userId, entry.id)).toEqual(entry);
    }));

  it('throws on a stored symptom without a severity', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const subject = await seedSubject(ctx, { userId, name: 'Headache' });
      const entry = symptomEntry(noteEntry(userId, await seedProposal(ctx, userId)), subject);
      const row = { ...toStoredEntry(entry), value: {}, createdAt: CREATED_AT, updatedAt: CREATED_AT };
      await ctx.tx.insert(entries).values(row);

      await expect(ctx.repos.entries.findById(userId, entry.id)).rejects.toThrow('no valid severity');
    }));
});

// The one place where the core use cases run on the real repositories.
describe('entries with the core use cases', () => {
  it('records a confirmed proposal once, also after a correction', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { conversationId, toolUseId } = await seedOpenProposal(ctx, userId);
      const deps = { ...ctx.repos, clock: { now: () => LATER } };
      const draft = { kind: 'note', originalWords: 'slept badly', start: { date: '2026-01-01', precision: 'day' } } as const;
      const confirm = () =>
        confirmProposal(deps, {
          conversationId,
          toolUseId,
          id: randomUUID(),
          userId,
          timeZone: 'Europe/Madrid',
          draft,
        });

      const confirmed = await confirm();
      if (!confirmed.ok) throw new Error(confirmed.error);
      const source = await seedProposal(ctx, userId);
      const correction = { userId, entryId: confirmed.value.id, expectedVersion: 1, source, changes: {} };

      expect(await correctEntry(deps, correction)).toMatchObject({ ok: true, value: { version: 2 } });
      expect(await confirm()).toEqual({ ok: false, error: 'already_recorded' });
    }));
});

const INVALID_ROWS: readonly [string, Partial<NewEntryRow>, PgErrorCode][] = [
  ['a start time without day precision', { startTime: '08:00:00', startPrecision: 'month' }, PG_ERROR.checkViolation],
  ['an end time without an end date', { endTime: '10:00:00' }, PG_ERROR.checkViolation],
  ['an end date before the start date', { endDate: '2025-12-31' }, PG_ERROR.checkViolation],
  ['a note with a subject', { subjectId: randomUUID() }, PG_ERROR.checkViolation],
  ['a symptom without a subject', { kind: 'symptom', value: { severity: 1 } }, PG_ERROR.checkViolation],
  ['a symptom with an unknown subject', { kind: 'symptom', subjectId: randomUUID() }, PG_ERROR.foreignKeyViolation],
  ['an unknown source message', { sourceMessageId: randomUUID() }, PG_ERROR.foreignKeyViolation],
];

// The domain cannot build these rows, so they go to the table directly.
describe('entries rules', () => {
  it.each(INVALID_ROWS)('rejects %s', (_name, overrides, code) =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const stored = toStoredEntry(noteEntry(userId, await seedProposal(ctx, userId)));
      const row = { ...stored, createdAt: CREATED_AT, updatedAt: CREATED_AT, ...overrides };

      await expectViolation(ctx, code, ({ tx }) => tx.insert(entries).values(row));
    }),
  );
});
