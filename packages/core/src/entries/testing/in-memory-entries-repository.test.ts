import { describe, expect, it } from 'vitest';
import { headache, severity } from './entries.fixtures';
import { inMemoryEntriesRepository } from './in-memory-entries-repository';

const NOW = new Date('2026-03-15T10:00:00Z');
const NEXT_SOURCE = { messageId: 'message-9', toolUseId: 'toolu_9' };
const version2 = (overrides = {}) => headache({ version: 2, source: NEXT_SOURCE, severity: severity(7), ...overrides });

describe('inMemoryEntriesRepository', () => {
  it('throws when an insert uses an id that exists', async () => {
    const entries = inMemoryEntriesRepository([headache()]);

    await expect(entries.insert(headache({ source: NEXT_SOURCE }), NOW)).rejects.toThrow('already exists');
  });

  it('refuses a correction of another owner', async () => {
    const entries = inMemoryEntriesRepository([headache()]);

    expect(await entries.correct({ entry: version2({ userId: 'user-2' }), updatedAt: NOW })).toBe(false);
  });

  it('refuses a correction that skips a version', async () => {
    const entries = inMemoryEntriesRepository([headache()]);

    expect(await entries.correct({ entry: version2({ version: 3 }), updatedAt: NOW })).toBe(false);
  });

  it('throws when a correction reuses a source of any version', async () => {
    const entries = inMemoryEntriesRepository([headache()]);

    await expect(entries.correct({ entry: version2({ source: headache().source }), updatedAt: NOW })).rejects.toThrow(
      'never reused',
    );
  });

  it('does not let a test change a stored entry', async () => {
    const entries = inMemoryEntriesRepository([headache()]);
    const found = await entries.findById('user-1', 'entry-1');
    Object.assign(found?.start ?? {}, { date: '1999-01-01' });

    expect(await entries.findById('user-1', 'entry-1')).toMatchObject({ start: headache().start });
  });
});
