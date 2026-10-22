import { err, type Result } from '../../shared/domain/result';
import { FIRST_VERSION } from './correction';
import type { Entry, EntrySource } from './entry';
import { checkEntryTimes, type EntryTimesError } from './entry-times';
import { isComplete, type CompleteDraft, type EntryDraft } from './missing-fields';

export type EntryIdentity = {
  readonly userId: string;
  readonly timeZone: string;
  readonly source: EntrySource;
};

export type BuildEntryError = 'entry_fields_missing' | 'time_zone_invalid' | EntryTimesError;

const isValidTimeZone = (timeZone: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
};

const toEntry = (draft: CompleteDraft, identity: EntryIdentity & { readonly id: string }): Entry => {
  const base = {
    ...identity,
    version: FIRST_VERSION,
    originalWords: draft.originalWords,
    start: draft.start,
    startTime: draft.startTime ?? null,
    endDate: draft.endDate ?? null,
    endTime: draft.endTime ?? null,
  };
  if (draft.kind === 'note') return { ...base, kind: 'note' };
  return { ...base, kind: 'symptom', subjectId: draft.subjectId, severity: draft.severity };
};

// The first version of an entry, from a complete draft.
export const buildEntry = (
  draft: EntryDraft,
  identity: EntryIdentity & { readonly id: string },
): Result<Entry, BuildEntryError> => {
  if (!isComplete(draft)) return err('entry_fields_missing');
  if (!isValidTimeZone(identity.timeZone)) return err('time_zone_invalid');
  return checkEntryTimes(toEntry(draft, identity));
};
