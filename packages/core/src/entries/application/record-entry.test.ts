import { describe, expect, it } from 'vitest';
import { fixedClock } from '../../shared/testing/fixed-clock';
import { sequentialIds } from '../../shared/testing/sequential-ids';
import { entryIdentity, noteDraft, symptomDraft } from '../testing/entries.fixtures';
import { inMemoryEntriesRepository } from '../testing/in-memory-entries-repository';
import { recordEntry, type RecordEntryInput } from './record-entry';

const NOW = new Date('2026-03-15T10:00:00Z');
const clock = fixedClock(NOW);

const input = (draft: RecordEntryInput['draft'] = symptomDraft()): RecordEntryInput => ({ ...entryIdentity(), draft });

const setup = () => {
  const entries = inMemoryEntriesRepository();
  const deps = { entries, ids: sequentialIds('entry'), clock };
  return { entries, record: (value: RecordEntryInput) => recordEntry(deps, value) };
};

describe('recordEntry', () => {
  it('saves a complete draft as version 1 with a generated id', async () => {
    const { record } = setup();

    expect(await record(input())).toMatchObject({ ok: true, value: { id: 'entry-1', version: 1, startTime: null } });
  });

  it('stores the saved entry', async () => {
    const { record, entries } = setup();

    await record(input());

    expect(await entries.findById('user-1', 'entry-1')).toMatchObject({ severity: 6 });
  });

  it('stores the time of the clock as the creation time', async () => {
    const { record, entries } = setup();

    await record(input());

    expect(entries.timestampsOf('entry-1')).toEqual({ createdAt: NOW, updatedAt: NOW });
  });

  it('saves a note without a subject or a severity', async () => {
    const { record } = setup();

    const result = await record(input(noteDraft()));

    expect(result).toMatchObject({ ok: true, value: { kind: 'note', start: { precision: 'month' } } });
    expect(result.ok && 'severity' in result.value).toBe(false);
  });

  it('rejects a draft with a missing field', async () => {
    const { record } = setup();

    expect(await record(input({ kind: 'symptom', originalWords: 'headache', subjectId: 'headache' }))).toEqual({
      ok: false,
      error: 'entry_fields_missing',
    });
  });

  it('rejects a start time on a month', async () => {
    const { record } = setup();
    const draft = noteDraft({ startTime: '10:00:00' });

    expect(await record(input(draft))).toEqual({ ok: false, error: 'start_time_without_day' });
  });

  it('rejects an end before the start', async () => {
    const { record } = setup();
    const draft = symptomDraft({ endDate: '2026-03-13' });

    expect(await record(input(draft))).toEqual({ ok: false, error: 'end_before_start' });
  });

  it('rejects an unknown time zone', async () => {
    const { record } = setup();

    expect(await record({ ...input(), timeZone: 'Mars/Olympus' })).toEqual({ ok: false, error: 'time_zone_invalid' });
  });

  it('records a source only once', async () => {
    const { record, entries } = setup();

    await record(input());
    const again = await record(input());

    expect(again).toEqual({ ok: false, error: 'entry_already_recorded' });
    expect(await entries.findById('user-1', 'entry-2')).toBeUndefined();
  });
});
