import type { Entry, EntrySource } from '../domain/entry';
import type { EntriesRepository } from '../ports/entries-repository';

const sourceKey = ({ messageId, toolUseId }: EntrySource): string => `${messageId}/${toolUseId ?? ''}`;

// Keeps every source that any version used, like entry_history does, so a corrected entry still blocks its proposal.
export const inMemoryEntriesRepository = (seed: readonly Entry[] = []): EntriesRepository => {
  const rows = new Map(seed.map((entry) => [entry.id, entry]));
  const sources = new Set(seed.map((entry) => sourceKey(entry.source)));
  const save = (entry: Entry): true => {
    rows.set(entry.id, entry);
    sources.add(sourceKey(entry.source));
    return true;
  };
  return {
    findById: async (userId, id) => {
      const entry = rows.get(id);
      return entry?.userId === userId ? entry : undefined;
    },
    insert: async (entry) => !sources.has(sourceKey(entry.source)) && save(entry),
    correct: async ({ entry, expectedVersion }) => rows.get(entry.id)?.version === expectedVersion && save(entry),
  };
};
