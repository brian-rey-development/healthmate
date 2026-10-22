import { describe, expect, it } from 'vitest';
import { fixedClock } from '../../shared/testing/fixed-clock';
import { headache, severity } from '../testing/entries.fixtures';
import { inMemoryEntriesRepository } from '../testing/in-memory-entries-repository';
import { correctEntry, type CorrectEntryInput } from './correct-entry';

const NOW = new Date('2026-03-15T10:00:00Z');
const clock = fixedClock(NOW);

const input = (overrides: Partial<CorrectEntryInput> = {}): CorrectEntryInput => ({
  userId: 'user-1',
  entryId: 'entry-1',
  expectedVersion: 1,
  source: { messageId: 'message-9', toolUseId: 'toolu_9' },
  changes: { severity: severity(7) },
  ...overrides,
});

describe('correctEntry', () => {
  it('returns the corrected entry as the next version', async () => {
    const entries = inMemoryEntriesRepository([headache()]);

    const result = await correctEntry({ entries, clock }, input());

    expect(result).toMatchObject({ ok: true, value: { version: 2, severity: 7 } });
  });

  it('stores the corrected entry', async () => {
    const entries = inMemoryEntriesRepository([headache()]);

    await correctEntry({ entries, clock }, input());

    expect(await entries.findById('user-1', 'entry-1')).toMatchObject({ version: 2, severity: 7 });
  });

  it('stores the time of the clock as the update time and keeps the creation time', async () => {
    const entries = inMemoryEntriesRepository([headache()]);
    const created = entries.timestampsOf('entry-1')?.createdAt;

    await correctEntry({ entries, clock }, input());

    expect(entries.timestampsOf('entry-1')).toEqual({ createdAt: created, updatedAt: NOW });
  });

  it('returns entry_not_found for an entry of another user', async () => {
    const entries = inMemoryEntriesRepository([headache()]);

    expect(await correctEntry({ entries, clock }, input({ userId: 'user-2' }))).toEqual({
      ok: false,
      error: 'entry_not_found',
    });
  });

  it('lets only the first of 2 corrections of the same version win', async () => {
    const entries = inMemoryEntriesRepository([headache()]);

    const first = await correctEntry({ entries, clock }, input());
    const second = await correctEntry({ entries, clock }, input({ changes: { severity: severity(2) } }));

    expect(first).toMatchObject({ ok: true });
    expect(second).toEqual({ ok: false, error: 'entry_version_stale' });
    expect(await entries.findById('user-1', 'entry-1')).toMatchObject({ severity: 7 });
  });

  it('returns entry_version_stale when the repository loses the race', async () => {
    const entries = { ...inMemoryEntriesRepository([headache()]), correct: async () => false };

    expect(await correctEntry({ entries, clock }, input())).toEqual({ ok: false, error: 'entry_version_stale' });
  });

  it('returns the time error of a correction', async () => {
    const entries = inMemoryEntriesRepository([headache()]);

    const result = await correctEntry({ entries, clock }, input({ changes: { endDate: '2026-03-13' } }));

    expect(result).toEqual({ ok: false, error: 'end_before_start' });
  });
});
