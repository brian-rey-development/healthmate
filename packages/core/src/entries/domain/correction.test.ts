import { describe, expect, it } from 'vitest';
import { headache, note, severity } from '../testing/entries.fixtures';
import type { Entry } from './entry';
import { applyCorrection, FIRST_VERSION, nextVersion, type EntryChanges } from './correction';

const SOURCE = { messageId: 'message-9', toolUseId: 'toolu_9' };
const correct = (changes: EntryChanges, entry: Entry = headache()) =>
  applyCorrection(entry, { expectedVersion: entry.version, source: SOURCE, changes });

describe('applyCorrection', () => {
  it('changes the fields, adds 1 to the version and records the new source', () => {
    expect(correct({ severity: severity(7) })).toEqual({
      ok: true,
      value: headache({ severity: severity(7), version: 2, source: SOURCE }),
    });
  });

  it('keeps every field that the changes do not name', () => {
    const result = correct({ originalWords: 'worse now' });

    expect(result).toEqual({ ok: true, value: headache({ originalWords: 'worse now', version: 2, source: SOURCE }) });
  });

  it('keeps a field whose change is undefined', () => {
    const result = correct({ start: undefined, originalWords: 'worse now' });

    expect(result).toMatchObject({ ok: true, value: { start: headache().start } });
  });

  it('clears the end date with null', () => {
    const entry = headache({ endDate: '2026-03-15' });

    expect(correct({ endDate: null }, entry)).toMatchObject({ ok: true, value: { endDate: null } });
  });

  it('refuses a correction that changes nothing', () => {
    expect(correct({})).toEqual({ ok: false, error: 'correction_empty' });
  });

  it('refuses a correction whose changes are all undefined', () => {
    expect(correct({ start: undefined, severity: undefined })).toEqual({ ok: false, error: 'correction_empty' });
  });

  it('refuses a correction based on an older version', () => {
    const result = applyCorrection(headache({ version: 3 }), { expectedVersion: 2, source: SOURCE, changes: {} });

    expect(result).toEqual({ ok: false, error: 'entry_version_stale' });
  });

  it('refuses a severity on a note', () => {
    expect(correct({ severity: severity(3) }, note())).toEqual({ ok: false, error: 'note_has_severity' });
  });

  it.each([
    [{ startTime: '25:00:00' }, 'time_invalid'],
    [{ endDate: '2026-02-30' }, 'date_invalid'],
    [{ endDate: '2026-03-13' }, 'end_before_start'],
    [{ endTime: '16:00:00' }, 'end_time_without_end_date'],
  ] as const)('refuses %o with %s', (changes, error) => {
    expect(correct(changes)).toEqual({ ok: false, error });
  });

  it('refuses a start time on a month', () => {
    expect(correct({ startTime: '10:00:00' }, note())).toEqual({ ok: false, error: 'start_time_without_day' });
  });
});

describe('versions', () => {
  it('starts at 1 and adds 1', () => {
    expect([FIRST_VERSION, nextVersion(FIRST_VERSION)]).toEqual([1, 2]);
  });
});
