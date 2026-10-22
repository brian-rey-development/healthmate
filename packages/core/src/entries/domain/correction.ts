import { err, ok, type Result } from '../../shared/domain/result';
import type { Entry, EntrySource } from './entry';
import type { EntryDate } from './entry-date';
import type { Severity } from './severity';

export type EntryChanges = {
  readonly start?: EntryDate;
  readonly originalWords?: string;
  readonly severity?: Severity;
};

export type CorrectionError = 'stale_version' | 'severity_on_note';

export type Correction = {
  readonly expectedVersion: number;
  readonly source: EntrySource;
  readonly changes: EntryChanges;
};

export const applyCorrection = (entry: Entry, correction: Correction): Result<Entry, CorrectionError> => {
  const { expectedVersion, source, changes } = correction;
  const { severity, ...common } = changes;
  if (entry.version !== expectedVersion) return err('stale_version');
  const next = { ...common, version: entry.version + 1, source };
  if (entry.kind === 'note') return severity === undefined ? ok({ ...entry, ...next }) : err('severity_on_note');
  return ok({ ...entry, ...next, severity: severity ?? entry.severity });
};
