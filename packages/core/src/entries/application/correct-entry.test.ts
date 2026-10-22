import { describe, expect, it } from 'vitest';
import { fixedClock } from '../../shared/testing/fixed-clock';
import type { Severity } from '../domain/severity';
import { headache } from '../testing/entries.fixtures';
import { inMemoryEntriesRepository } from '../testing/in-memory-entries-repository';
import { correctEntry, type CorrectEntryInput } from './correct-entry';

const clock = fixedClock(new Date('2026-03-15T10:00:00Z'));

const input = (overrides: Partial<CorrectEntryInput> = {}): CorrectEntryInput => ({
  userId: 'user-1',
  entryId: 'entry-1',
  expectedVersion: 1,
  source: { messageId: 'message-9', toolUseId: 'toolu_9' },
  changes: { severity: 7 as Severity },
  ...overrides,
});

describe('correctEntry', () => {
  it('saves the corrected entry as the next version', async () => {
    const entries = inMemoryEntriesRepository([headache()]);

    const result = await correctEntry({ entries, clock }, input());

    expect(result).toMatchObject({ ok: true, value: { version: 2, severity: 7 } });
    expect(await entries.findById('user-1', 'entry-1')).toMatchObject({ version: 2, severity: 7 });
  });

  it('returns not_found for an entry of another user', async () => {
    const entries = inMemoryEntriesRepository([headache()]);

    expect(await correctEntry({ entries, clock }, input({ userId: 'user-2' }))).toEqual({
      ok: false,
      error: 'not_found',
    });
  });

  it('lets only the first of 2 corrections of the same version win', async () => {
    const entries = inMemoryEntriesRepository([headache()]);

    const first = await correctEntry({ entries, clock }, input());
    const second = await correctEntry({ entries, clock }, input({ changes: { severity: 2 as Severity } }));

    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, error: 'stale_version' });
    expect(await entries.findById('user-1', 'entry-1')).toMatchObject({ severity: 7 });
  });
});
