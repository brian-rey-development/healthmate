import type { EntryDate } from './entry-date';
import type { Severity } from './severity';

export type EntrySource = { readonly messageId: string; readonly toolUseId: string | null };

// Times are "HH:MM:SS" in the time zone of the entry. An open entry has no end date.
export type EntryTimes = {
  readonly start: EntryDate;
  readonly startTime: string | null;
  readonly endDate: string | null;
  readonly endTime: string | null;
};

type EntryBase = EntryTimes & {
  readonly id: string;
  readonly userId: string;
  readonly version: number;
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

export const KINDS = ['note', 'symptom'] as const satisfies readonly Entry['kind'][];

export type Kind = (typeof KINDS)[number];

type AssertTrue<T extends true> = T;

export type KindsAreComplete = AssertTrue<Entry['kind'] extends Kind ? true : false>;

export type EntryVersion = Entry & { readonly recordedAt: Date };
