import { err, ok, type Result } from '../../shared/domain/result';
import type { Clock } from '../../shared/ports/clock';
import { buildEntry, type BuildEntryError, type EntryIdentity } from '../domain/build-entry';
import type { Entry } from '../domain/entry';
import type { EntryDraft } from '../domain/missing-fields';
import type { EntriesRepository } from '../ports/entries-repository';

export type RecordEntryDeps = { readonly entries: EntriesRepository; readonly clock: Clock };

export type RecordEntryInput = EntryIdentity & { readonly draft: EntryDraft };

export type RecordEntryError = BuildEntryError | 'already_recorded';

// A form submit records at once. A proposal records through confirmProposal, which checks it first.
export const recordEntry = async (
  { entries, clock }: RecordEntryDeps,
  { draft, ...identity }: RecordEntryInput,
): Promise<Result<Entry, RecordEntryError>> => {
  const entry = buildEntry(draft, identity);
  if (!entry.ok) return entry;
  return (await entries.insert(entry.value, clock.now())) ? ok(entry.value) : err('already_recorded');
};
