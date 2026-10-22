import { describe, expect, it } from 'vitest';
import { fixedClock } from '../../shared/testing/fixed-clock';
import type { Severity } from '../domain/severity';
import { inMemoryEntriesRepository } from '../testing/in-memory-entries-repository';
import { recordEntry, type RecordEntryInput } from './record-entry';

const clock = fixedClock(new Date('2026-03-15T10:00:00Z'));

const input = (overrides: Partial<RecordEntryInput['draft']> = {}): RecordEntryInput => ({
  id: 'entry-1',
  userId: 'user-1',
  timeZone: 'Europe/Madrid',
  source: { messageId: 'message-1', toolUseId: 'toolu_1' },
  draft: {
    kind: 'symptom',
    originalWords: 'headache, 6 out of 10',
    subjectId: 'headache',
    severity: 6 as Severity,
    start: { date: '2026-03-14', precision: 'day' },
    ...overrides,
  },
});

describe('recordEntry', () => {
  it('saves a complete draft as version 1', async () => {
    const entries = inMemoryEntriesRepository();

    const result = await recordEntry({ entries, clock }, input());

    expect(result).toMatchObject({ ok: true, value: { id: 'entry-1', version: 1, startTime: null } });
    expect(await entries.findById('user-1', 'entry-1')).toMatchObject({ severity: 6 });
  });

  it('rejects a draft with a missing field', async () => {
    const entries = inMemoryEntriesRepository();

    const draft = { kind: 'symptom', originalWords: 'headache', subjectId: 'headache' } as const;
    expect(await recordEntry({ entries, clock }, { ...input(), draft })).toEqual({
      ok: false,
      error: 'missing_fields',
    });
  });

  it('records a source only once', async () => {
    const entries = inMemoryEntriesRepository();

    await recordEntry({ entries, clock }, input());
    const again = await recordEntry({ entries, clock }, { ...input(), id: 'entry-2' });

    expect(again).toEqual({ ok: false, error: 'already_recorded' });
    expect(await entries.findById('user-1', 'entry-2')).toBeUndefined();
  });
});
