import { err, ok, type Result } from '../../shared/domain/result';
import type { Clock } from '../../shared/ports/clock';
import type { IdGenerator } from '../../shared/ports/id-generator';
import { buildEntry, type BuildEntryError, type EntryIdentity } from '../domain/build-entry';
import type { Entry } from '../domain/entry';
import type { EntryDraft } from '../domain/missing-fields';
import type { EntriesRepository } from '../ports/entries-repository';

export type RecordEntryDeps = {
  readonly entries: EntriesRepository;
  readonly ids: IdGenerator;
  readonly clock: Clock;
};

export type RecordEntryInput = EntryIdentity & { readonly draft: EntryDraft };

export type RecordEntryError = BuildEntryError | 'entry_already_recorded';

export const saveEntry = async (
  { entries, ids }: Omit<RecordEntryDeps, 'clock'>,
  { draft, ...identity }: RecordEntryInput,
  now: Date,
): Promise<Result<Entry, RecordEntryError>> => {
  const built = buildEntry(draft, { ...identity, id: ids.next() });
  if (!built.ok) return built;
  return (await entries.insert(built.value, now)) ? ok(built.value) : err('entry_already_recorded');
};

// A form submit records at once. A proposal records through confirmProposal, which checks it first.
export const recordEntry = (deps: RecordEntryDeps, input: RecordEntryInput): Promise<Result<Entry, RecordEntryError>> =>
  saveEntry(deps, input, deps.clock.now());
