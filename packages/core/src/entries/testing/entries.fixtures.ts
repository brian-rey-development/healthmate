import type { NoteEntry, SymptomEntry } from '../domain/entry';
import type { Severity } from '../domain/severity';

export const headache = (overrides: Partial<SymptomEntry> = {}): SymptomEntry => ({
  id: 'entry-1',
  userId: 'user-1',
  version: 1,
  kind: 'symptom',
  subjectId: 'headache',
  severity: 6 as Severity,
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
