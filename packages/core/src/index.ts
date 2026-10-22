export { err, ok, type Err, type Ok, type Result } from './shared/domain/result';
export type { Clock } from './shared/ports/clock';
export type { IdGenerator } from './shared/ports/id-generator';

export { applyCorrection, type Correction, type CorrectionError, type EntryChanges } from './entries/domain/correction';
export type { Entry, EntrySource, Kind, NoteEntry, SymptomEntry } from './entries/domain/entry';
export { createEntryDate, type DatePrecision, type EntryDate, type EntryDateError } from './entries/domain/entry-date';
export { missingFields, type EntryDraft, type RequiredField } from './entries/domain/missing-fields';
export { createSeverity, MAX_SEVERITY, MIN_SEVERITY, type Severity } from './entries/domain/severity';
export type { EntriesRepository } from './entries/ports/entries-repository';
export {
  correctEntry,
  type CorrectEntryDeps,
  type CorrectEntryError,
  type CorrectEntryInput,
} from './entries/application/correct-entry';
