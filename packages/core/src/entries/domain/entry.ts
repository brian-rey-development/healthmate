import type { EntryDate } from './entry-date';
import type { Severity } from './severity';

export type EntrySource = { readonly messageId: string; readonly toolUseId: string | null };

type EntryBase = {
  readonly id: string;
  readonly userId: string;
  readonly version: number;
  readonly start: EntryDate;
  readonly originalWords: string;
  readonly timeZone: string;
  readonly source: EntrySource;
};

export type NoteEntry = EntryBase & { readonly kind: 'note' };

export type SymptomEntry = EntryBase & {
  readonly kind: 'symptom';
  readonly subjectId: string;
  readonly severity: Severity;
};

export type Entry = NoteEntry | SymptomEntry;

export type Kind = Entry['kind'];
