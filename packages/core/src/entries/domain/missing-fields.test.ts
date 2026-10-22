import { describe, expect, it } from 'vitest';
import { noteDraft, severity, symptomDraft } from '../testing/entries.fixtures';
import { isComplete, missingFields } from './missing-fields';

const MARCH_14 = { date: '2026-03-14', precision: 'day' } as const;
const WORDS = 'headache since this morning';

describe('missingFields', () => {
  it('asks a symptom for its subject, severity and start date, in that order', () => {
    expect(missingFields({ kind: 'symptom', originalWords: WORDS })).toEqual(['subjectId', 'severity', 'start']);
  });

  it('asks only for what is still missing', () => {
    const draft = { kind: 'symptom', originalWords: WORDS, subjectId: 'headache', start: MARCH_14 } as const;
    expect(missingFields(draft)).toEqual(['severity']);
  });

  it('asks nothing when a symptom is complete', () => {
    expect(missingFields(symptomDraft({ originalWords: WORDS, severity: severity(6) }))).toEqual([]);
  });

  it('never asks a note for a severity', () => {
    expect(missingFields({ kind: 'note', originalWords: WORDS })).toEqual(['start']);
  });

  it('treats a field set to undefined as missing', () => {
    expect(missingFields(symptomDraft({ severity: undefined }))).toEqual(['severity']);
  });
});

describe('isComplete', () => {
  it('is true for a complete note', () => {
    expect(isComplete(noteDraft())).toBe(true);
  });

  it('is false for a note without a start', () => {
    expect(isComplete({ kind: 'note', originalWords: WORDS })).toBe(false);
  });
});
