import { randomUUID } from 'node:crypto';
import { confirmProposal, correctEntry, ok, type EntrySource, type SymptomEntry } from '@healthmate/core';
import { getTableColumns } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import {
  buildNote,
  buildSymptom,
  connectTestDb,
  CREATED_AT,
  expectViolation,
  inRollback,
  LATER,
  PG_ERROR,
  seedEntry,
  seedEntrySource,
  seedNote,
  seedProposalMessage,
  seedSubject,
  seedUser,
  severityOf,
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
  const note = buildNote(userId, await seedEntrySource(ctx, userId), { originalWords: 'headache since 8:30' });
  const times = { startTime: '08:30:00', endDate: '2026-01-02', endTime: '10:00:00' };
  return seedEntry(ctx, buildSymptom(note, subject, times));
};

const corrected = (entry: SymptomEntry, source: EntrySource): SymptomEntry => ({
  ...entry,
  version: entry.version + 1,
  severity: severityOf(4),
  source,
});

const correct = (ctx: TestContext, entry: SymptomEntry) => ctx.repos.entries.correct({ entry, updatedAt: LATER });

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

  it('does not let another user read the entry', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);

      expect(await ctx.repos.entries.findById(otherId, entry.id)).toBeUndefined();
    }));

  it('returns true for a new entry', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const source = await seedEntrySource(ctx, userId);

      expect(await ctx.repos.entries.insert(buildNote(userId, source), CREATED_AT)).toBe(true);
    }));

  it('returns false when the same proposal is confirmed twice', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const source = await seedEntrySource(ctx, userId);
      await ctx.repos.entries.insert(buildNote(userId, source), CREATED_AT);

      expect(await ctx.repos.entries.insert(buildNote(userId, source), CREATED_AT)).toBe(false);
    }));

  it('returns false when a source without a tool_use id is used twice', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { messageId } = await seedProposalMessage(ctx, userId);
      const source = { messageId, toolUseId: null };
      await ctx.repos.entries.insert(buildNote(userId, source), CREATED_AT);

      expect(await ctx.repos.entries.insert(buildNote(userId, source), CREATED_AT)).toBe(false);
    }));

  it('returns false when a proposal is confirmed again after its entry was corrected', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);
      await correct(ctx, corrected(entry, await seedEntrySource(ctx, userId)));

      expect(await ctx.repos.entries.insert({ ...entry, id: randomUUID() }, LATER)).toBe(false);
    }));

  it('throws when the id already exists', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);
      const source = await seedEntrySource(ctx, userId);

      await expectViolation(ctx, PG_ERROR.uniqueViolation, ({ repos }) =>
        repos.entries.insert({ ...entry, source }, LATER),
      );
    }));

  it('returns true for a correction of the stored version', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);

      expect(await correct(ctx, corrected(entry, await seedEntrySource(ctx, userId)))).toBe(true);
    }));

  it('stores a correction as the current entry', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);
      const next = corrected(entry, await seedEntrySource(ctx, userId));
      await correct(ctx, next);

      expect(await ctx.repos.entries.findById(userId, entry.id)).toEqual(next);
    }));

  it('keeps the old version in history after a correction', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);
      const next = corrected(entry, await seedEntrySource(ctx, userId));
      await correct(ctx, next);

      const versions = await ctx.repos.entryHistory.listVersions(userId, entry.id, 10);
      expect(versions).toEqual([{ ...next, recordedAt: LATER }, { ...entry, recordedAt: CREATED_AT }]);
    }));

  it('refuses a correction based on a stale version', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);
      await correct(ctx, corrected(entry, await seedEntrySource(ctx, userId)));

      expect(await correct(ctx, corrected(entry, await seedEntrySource(ctx, userId)))).toBe(false);
    }));

  it('refuses a correction that skips a version', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);
      const skipped = { ...corrected(entry, await seedEntrySource(ctx, userId)), version: 3 };

      expect(await correct(ctx, skipped)).toBe(false);
    }));

  it('leaves the stored entry unchanged after a refused correction', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);
      await correct(ctx, { ...corrected(entry, await seedEntrySource(ctx, userId)), version: 3 });

      expect(await ctx.repos.entries.findById(userId, entry.id)).toEqual(entry);
    }));

  it('returns false when the entry does not exist', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);
      const unknown = { ...corrected(entry, await seedEntrySource(ctx, userId)), id: randomUUID() };

      expect(await correct(ctx, unknown)).toBe(false);
    }));

  it('throws when a correction reuses the source of the stored version', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);

      await expectViolation(ctx, PG_ERROR.uniqueViolation, (scope) => correct(scope, corrected(entry, entry.source)));
    }));

  it('throws when a correction reuses the source of an older version', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);
      const second = corrected(entry, await seedEntrySource(ctx, userId));
      await correct(ctx, second);

      await expectViolation(ctx, PG_ERROR.uniqueViolation, (scope) =>
        correct(scope, { ...corrected(second, entry.source), version: 3 }),
      );
    }));

  it('does not let another user correct the entry', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);
      const stolen = { ...corrected(entry, await seedEntrySource(ctx, otherId)), userId: otherId };

      expect(await correct(ctx, stolen)).toBe(false);
    }));

  it('leaves the entry of the owner unchanged after a correction by another user', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      const entry = await seedHeadache(ctx, userId);
      await correct(ctx, { ...corrected(entry, await seedEntrySource(ctx, otherId)), userId: otherId });

      expect(await ctx.repos.entries.findById(userId, entry.id)).toEqual(entry);
    }));

  it('throws on a stored symptom without a severity', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const subject = await seedSubject(ctx, { userId, name: 'Headache' });
      const entry = buildSymptom(buildNote(userId, await seedEntrySource(ctx, userId)), subject);
      const row = { ...toStoredEntry(entry), value: {}, createdAt: CREATED_AT, updatedAt: CREATED_AT };
      await ctx.tx.insert(entries).values(row);

      await expect(ctx.repos.entries.findById(userId, entry.id)).rejects.toThrow('no valid severity');
    }));
});

// The one place where the core use cases run on the real repositories.
describe('entries with the core use cases', () => {
  const draft = { kind: 'note', originalWords: 'slept badly', start: { date: '2026-01-01', precision: 'day' } } as const;

  const setup = async (ctx: TestContext) => {
    const userId = await seedUser(ctx);
    const { conversationId, toolUseId } = await seedProposalMessage(ctx, userId);
    const deps = { ...ctx.repos, ids: { next: randomUUID }, clock: { now: () => LATER }, parseDraft: () => ok(draft) };
    const confirm = () => confirmProposal(deps, { userId, conversationId, toolUseId, timeZone: 'Europe/Madrid' });
    return { userId, deps, confirm };
  };

  it('records a confirmed proposal once, also after a correction', () =>
    inRollback(db, async (ctx) => {
      const { userId, deps, confirm } = await setup(ctx);
      const confirmed = await confirm();
      if (!confirmed.ok) throw new Error(confirmed.error);
      const source = await seedEntrySource(ctx, userId);
      const correction = { userId, entryId: confirmed.value.id, expectedVersion: 1, source, changes: { originalWords: 'woke up twice' } };

      expect(await correctEntry(deps, correction)).toMatchObject({ ok: true, value: { version: 2 } });
      expect(await confirm()).toEqual({ ok: false, error: 'entry_already_recorded' });
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
  ['a version below 1', { version: 0 }, PG_ERROR.checkViolation],
];

// The domain cannot build these rows, so they go to the table directly.
describe('entries rules', () => {
  it.each(INVALID_ROWS)('rejects %s', (_name, overrides, code) =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const stored = toStoredEntry(buildNote(userId, await seedEntrySource(ctx, userId)));
      const row = { ...stored, createdAt: CREATED_AT, updatedAt: CREATED_AT, ...overrides };

      await expectViolation(ctx, code, ({ tx }) => tx.insert(entries).values(row));
    }),
  );
});
