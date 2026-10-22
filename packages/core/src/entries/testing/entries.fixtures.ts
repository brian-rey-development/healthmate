import type { EntryIdentity } from '../domain/build-entry';
import type { NoteEntry, SymptomEntry } from '../domain/entry';
import type { NoteDraft, SymptomDraft } from '../domain/missing-fields';
import { createSeverity, type Severity } from '../domain/severity';

export const severity = (value: number): Severity => {
  const result = createSeverity(value);
  if (!result.ok) throw new Error(`fixture severity ${value} is invalid`);
  return result.value;
};

export const headache = (overrides: Partial<SymptomEntry> = {}): SymptomEntry => ({
  id: 'entry-1',
  userId: 'user-1',
  version: 1,
  kind: 'symptom',
  subjectId: 'headache',
  severity: severity(6),
  start: { date: '2026-03-14', precision: 'day' },
  startTime: '15:00:00',
  endDate: null,
  endTime: null,
  originalWords: 'headache since 3pm, 6 out of 10',
  timeZone: 'Europe/Madrid',
  source: { messageId: 'message-1', toolUseId: 'toolu_1' },
  ...overrides,
});

export const note = (overrides: Partial<NoteEntry> = {}): NoteEntry => ({
  id: 'entry-2',
  userId: 'user-1',
  version: 1,
  kind: 'note',
  start: { date: '2026-03-01', precision: 'month' },
  startTime: null,
  endDate: null,
  endTime: null,
  originalWords: 'slept badly in March',
  timeZone: 'Europe/Madrid',
  source: { messageId: 'message-2', toolUseId: null },
  ...overrides,
});

export const symptomDraft = (overrides: Partial<SymptomDraft> = {}): SymptomDraft => ({
  kind: 'symptom',
  originalWords: 'headache, 6 out of 10',
  subjectId: 'headache',
  severity: severity(6),
  start: { date: '2026-03-14', precision: 'day' },
  ...overrides,
});

export const noteDraft = (overrides: Partial<NoteDraft> = {}): NoteDraft => ({
  kind: 'note',
  originalWords: 'slept badly in March',
  start: { date: '2026-03-01', precision: 'month' },
  ...overrides,
});

export const entryIdentity = (overrides: Partial<EntryIdentity> = {}): EntryIdentity => ({
  userId: 'user-1',
  timeZone: 'Europe/Madrid',
  source: { messageId: 'message-1', toolUseId: 'toolu_1' },
  ...overrides,
});
