import type { Result } from '../../shared/domain/result';
import { createBoundedText } from '../../shared/domain/text';

export type SubjectKind = 'symptom';

// A seed subject has no user and every person sees it. A private subject belongs to one person.
export type Subject = {
  readonly id: string;
  readonly userId: string | null;
  readonly kind: SubjectKind;
  readonly name: string;
};

export const MAX_SUBJECT_NAME_LENGTH = 60;

export const createSubjectName = (value: string): Result<string, 'subject_name_invalid'> =>
  createBoundedText(value, MAX_SUBJECT_NAME_LENGTH, 'subject_name_invalid');
