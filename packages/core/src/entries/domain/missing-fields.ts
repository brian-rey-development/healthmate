import type { Kind } from './entry';
import type { EntryDate } from './entry-date';
import type { Severity } from './severity';

type DraftBase = {
  readonly originalWords: string;
  readonly start?: EntryDate | undefined;
  readonly startTime?: string | undefined;
  readonly endDate?: string | undefined;
  readonly endTime?: string | undefined;
};

export type NoteDraft = DraftBase & { readonly kind: 'note' };

export type SymptomDraft = DraftBase & {
  readonly kind: 'symptom';
  readonly subjectId?: string | undefined;
  readonly severity?: Severity | undefined;
};

export type EntryDraft = NoteDraft | SymptomDraft;

export type CompleteDraft =
  | (NoteDraft & { readonly start: EntryDate })
  | (SymptomDraft & { readonly start: EntryDate; readonly subjectId: string; readonly severity: Severity });

const REQUIRED_FIELDS = {
  note: ['start'],
  symptom: ['subjectId', 'severity', 'start'],
} as const satisfies Record<Kind, readonly (keyof NoteDraft | keyof SymptomDraft)[]>;

export type RequiredField = (typeof REQUIRED_FIELDS)[Kind][number];

const presentFields = (draft: EntryDraft): ReadonlySet<string> =>
  new Set(Object.entries(draft).flatMap(([field, value]) => (value === undefined ? [] : [field])));

// The agent asks for the first missing field, one question at a time, and never asks for an optional one.
export const missingFields = (draft: EntryDraft): readonly RequiredField[] => {
  const required: readonly RequiredField[] = REQUIRED_FIELDS[draft.kind];
  const present = presentFields(draft);
  return required.filter((field) => !present.has(field));
};

export const isComplete = (draft: EntryDraft): draft is CompleteDraft => missingFields(draft).length === 0;
