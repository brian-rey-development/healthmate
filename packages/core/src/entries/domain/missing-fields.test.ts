import { describe, expect, it } from 'vitest';
import { missingFields } from './missing-fields';
import type { Severity } from './severity';

const MARCH_14 = { date: '2026-03-14', precision: 'day' } as const;

describe('missingFields', () => {
  it('asks a symptom for its subject, severity and start date, in that order', () => {
    expect(missingFields({ kind: 'symptom' })).toEqual(['subjectId', 'severity', 'start']);
  });

  it('asks only for what is still missing', () => {
    expect(missingFields({ kind: 'symptom', subjectId: 'headache', start: MARCH_14 })).toEqual(['severity']);
  });

  it('asks nothing when a symptom is complete', () => {
    const draft = { kind: 'symptom', subjectId: 'headache', severity: 6 as Severity, start: MARCH_14 } as const;
    expect(missingFields(draft)).toEqual([]);
  });

  it('never asks a note for a severity', () => {
    expect(missingFields({ kind: 'note' })).toEqual(['originalWords', 'start']);
  });
});
