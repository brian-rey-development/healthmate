import { createSeverity, type Entry, type Severity } from '@healthmate/core';
import type { EntryRow } from './entries.table';

// The columns of one entry version. entries and entry_history both hold them.
export type StoredEntry = Omit<EntryRow, 'createdAt' | 'updatedAt'>;

const severityOf = (row: StoredEntry): Severity => {
  const severity = createSeverity('severity' in row.value ? row.value.severity : Number.NaN);
  if (!severity.ok) throw new Error(`Entry ${row.id} version ${row.version} has no valid severity`);
  return severity.value;
};

const subjectIdOf = (row: StoredEntry): string => {
  if (row.subjectId === null) throw new Error(`Symptom entry ${row.id} version ${row.version} has no subject`);
  return row.subjectId;
};

const entryBase = (row: StoredEntry) => ({
  id: row.id,
  userId: row.userId,
  version: row.version,
  originalWords: row.originalWords,
  timeZone: row.timeZone,
  start: { date: row.startDate, precision: row.startPrecision },
  startTime: row.startTime,
  endDate: row.endDate,
  endTime: row.endTime,
  source: { messageId: row.sourceMessageId, toolUseId: row.sourceToolUseId },
});

// Throws on a row that breaks a domain rule, because only a bug or a manual edit can write one.
export const toEntry = (row: StoredEntry): Entry =>
  row.kind === 'note'
    ? { ...entryBase(row), kind: 'note' }
    : { ...entryBase(row), kind: 'symptom', subjectId: subjectIdOf(row), severity: severityOf(row) };

export const toStoredEntry = (entry: Entry): StoredEntry => ({
  id: entry.id,
  userId: entry.userId,
  version: entry.version,
  kind: entry.kind,
  subjectId: entry.kind === 'symptom' ? entry.subjectId : null,
  value: entry.kind === 'symptom' ? { severity: entry.severity } : {},
  originalWords: entry.originalWords,
  startDate: entry.start.date,
  startPrecision: entry.start.precision,
  startTime: entry.startTime,
  endDate: entry.endDate,
  endTime: entry.endTime,
  timeZone: entry.timeZone,
  sourceMessageId: entry.source.messageId,
  sourceToolUseId: entry.source.toolUseId,
});
