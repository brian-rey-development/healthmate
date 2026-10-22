import { err, type Result } from '../../shared/domain/result';
import type { Entry, EntrySource } from './entry';
import { checkEntryTimes, type EntryTimesError } from './entry-times';
import type { EntryDraft } from './missing-fields';

export type EntryIdentity = {
  readonly id: string;
  readonly userId: string;
  readonly timeZone: string;
  readonly source: EntrySource;
};

export type BuildEntryError = 'missing_fields' | EntryTimesError;

// The first version of an entry, from a complete draft.
export const buildEntry = (draft: EntryDraft, identity: EntryIdentity): Result<Entry, BuildEntryError> => {
  const { start } = draft;
  if (start === undefined) return err('missing_fields');
  const base = {
    ...identity,
    version: 1,
    originalWords: draft.originalWords,
    start,
    startTime: draft.startTime ?? null,
    endDate: draft.endDate ?? null,
    endTime: draft.endTime ?? null,
  };
  if (draft.kind === 'note') return checkEntryTimes({ ...base, kind: 'note' });
  const { subjectId, severity } = draft;
  if (subjectId === undefined || severity === undefined) return err('missing_fields');
  return checkEntryTimes({ ...base, kind: 'symptom', subjectId, severity });
};
