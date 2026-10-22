import { err, type Result } from '../../shared/domain/result';
import type { Entry, EntrySource } from './entry';
import type { EntryDate } from './entry-date';
import { checkEntryTimes, type EntryTimesError } from './entry-times';
import type { Severity } from './severity';

export const FIRST_VERSION = 1;

export const nextVersion = (version: number): number => version + 1;

export type EntryChanges = {
  readonly start?: EntryDate | undefined;
  readonly startTime?: string | null | undefined;
  readonly endDate?: string | null | undefined;
  readonly endTime?: string | null | undefined;
  readonly originalWords?: string | undefined;
  readonly severity?: Severity | undefined;
};

type DefinedChanges = { readonly [K in keyof EntryChanges]?: Exclude<EntryChanges[K], undefined> };

export type CorrectionError =
  | 'entry_version_stale'
  | 'note_has_severity'
  | 'correction_empty'
  | EntryTimesError;

export type Correction = {
  readonly expectedVersion: number;
  readonly source: EntrySource;
  readonly changes: EntryChanges;
};

const definedOnly = (changes: EntryChanges): DefinedChanges =>
  Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined));

export const applyCorrection = (entry: Entry, correction: Correction): Result<Entry, CorrectionError> => {
  if (entry.version !== correction.expectedVersion) return err('entry_version_stale');
  const changes = definedOnly(correction.changes);
  if (Object.keys(changes).length === 0) return err('correction_empty');
  const { severity, ...common } = changes;
  const next = { ...common, version: nextVersion(entry.version), source: correction.source };
  if (entry.kind === 'note') {
    if (severity !== undefined) return err('note_has_severity');
    const corrected: Entry = { ...entry, ...next };
    return checkEntryTimes(corrected);
  }
  const corrected: Entry = { ...entry, ...next, severity: severity ?? entry.severity };
  return checkEntryTimes(corrected);
};
