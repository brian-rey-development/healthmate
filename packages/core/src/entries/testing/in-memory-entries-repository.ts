import { nextVersion } from '../domain/correction';
import type { Entry, EntrySource } from '../domain/entry';
import type { EntriesRepository, SavedCorrection } from '../ports/entries-repository';
import { copyEntry } from './copy-entry';

const SEED_AT = new Date(0);

export type EntryTimestamps = { readonly createdAt: Date; readonly updatedAt: Date };

export type InMemoryEntriesRepository = EntriesRepository & { timestampsOf(id: string): EntryTimestamps | undefined };

type Stored = { readonly entry: Entry; readonly createdAt: Date; readonly updatedAt: Date };

type State = { readonly rows: Map<string, Stored>; readonly sources: Set<string> };

const sourceKey = ({ messageId, toolUseId }: EntrySource): string => `${messageId}/${toolUseId ?? ''}`;

const insertEntry = ({ rows, sources }: State, entry: Entry, createdAt: Date): boolean => {
  if (rows.has(entry.id)) throw new Error(`entry ${entry.id} already exists`);
  if (sources.has(sourceKey(entry.source))) return false;
  rows.set(entry.id, { entry: copyEntry(entry), createdAt: new Date(createdAt), updatedAt: new Date(createdAt) });
  sources.add(sourceKey(entry.source));
  return true;
};

const correctEntry = ({ rows, sources }: State, { entry, updatedAt }: SavedCorrection): boolean => {
  const stored = rows.get(entry.id);
  if (stored === undefined || stored.entry.userId !== entry.userId) return false;
  if (nextVersion(stored.entry.version) !== entry.version) return false;
  if (sources.has(sourceKey(entry.source))) throw new Error('a source is never reused');
  rows.set(entry.id, { entry: copyEntry(entry), createdAt: stored.createdAt, updatedAt: new Date(updatedAt) });
  sources.add(sourceKey(entry.source));
  return true;
};

// Keeps every source that any version used, like entry_history does, so a corrected entry still blocks its proposal.
export const inMemoryEntriesRepository = (seed: readonly Entry[] = []): InMemoryEntriesRepository => {
  const state: State = {
    rows: new Map(seed.map((entry) => [entry.id, { entry: copyEntry(entry), createdAt: SEED_AT, updatedAt: SEED_AT }])),
    sources: new Set(seed.map((entry) => sourceKey(entry.source))),
  };
  return {
    findById: async (userId, id) => {
      const stored = state.rows.get(id);
      return stored?.entry.userId === userId ? copyEntry(stored.entry) : undefined;
    },
    insert: async (entry, createdAt) => insertEntry(state, entry, createdAt),
    correct: async (correction) => correctEntry(state, correction),
    timestampsOf: (id) => {
      const stored = state.rows.get(id);
      return stored && { createdAt: new Date(stored.createdAt), updatedAt: new Date(stored.updatedAt) };
    },
  };
};
