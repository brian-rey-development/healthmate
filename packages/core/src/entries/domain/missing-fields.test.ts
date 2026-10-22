import { describe, expect, it } from 'vitest';
import { missingFields } from './missing-fields';
import type { Severity } from './severity';

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
    const severity = 6 as Severity;
    const draft = { kind: 'symptom', originalWords: WORDS, subjectId: 'headache', severity, start: MARCH_14 } as const;
    expect(missingFields(draft)).toEqual([]);
  });

  it('never asks a note for a severity', () => {
    expect(missingFields({ kind: 'note', originalWords: WORDS })).toEqual(['start']);
  });
});
