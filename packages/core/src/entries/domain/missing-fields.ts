import type { Kind } from './entry';
import type { EntryDate } from './entry-date';
import type { Severity } from './severity';

export type EntryDraft = {
  readonly kind: Kind;
  readonly originalWords: string;
  readonly start?: EntryDate;
  readonly startTime?: string;
  readonly endDate?: string;
  readonly endTime?: string;
  readonly subjectId?: string;
  readonly severity?: Severity;
};

const REQUIRED_FIELDS = {
  note: ['start'],
  symptom: ['subjectId', 'severity', 'start'],
} as const satisfies Record<Kind, readonly (keyof EntryDraft)[]>;

export type RequiredField = (typeof REQUIRED_FIELDS)[Kind][number];

// The agent asks for the first missing field, one question at a time, and never asks for an optional one.
export const missingFields = (draft: EntryDraft): readonly RequiredField[] => {
  const required: readonly RequiredField[] = REQUIRED_FIELDS[draft.kind];
  return required.filter((field) => draft[field] === undefined);
};
