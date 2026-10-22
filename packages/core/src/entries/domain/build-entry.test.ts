import { describe, expect, it } from 'vitest';
import { entryIdentity, headache, noteDraft, symptomDraft } from '../testing/entries.fixtures';
import { buildEntry } from './build-entry';

const identity = { ...entryIdentity(), id: 'entry-1' };

describe('buildEntry', () => {
  it('builds version 1 of a symptom from a complete draft', () => {
    const draft = symptomDraft({ startTime: '15:00:00', originalWords: 'headache since 3pm, 6 out of 10' });

    expect(buildEntry(draft, identity)).toEqual({ ok: true, value: headache() });
  });

  it('builds a note without a subject or a severity', () => {
    expect(buildEntry(noteDraft(), identity)).toMatchObject({ ok: true, value: { kind: 'note', version: 1 } });
  });

  it('refuses an incomplete draft', () => {
    expect(buildEntry({ kind: 'symptom', originalWords: 'x' }, identity)).toEqual({
      ok: false,
      error: 'entry_fields_missing',
    });
  });

  it('refuses an unknown time zone', () => {
    expect(buildEntry(noteDraft(), { ...identity, timeZone: 'Nowhere/City' })).toEqual({
      ok: false,
      error: 'time_zone_invalid',
    });
  });

  it('accepts UTC as a time zone', () => {
    expect(buildEntry(noteDraft(), { ...identity, timeZone: 'UTC' })).toMatchObject({ ok: true });
  });
});
