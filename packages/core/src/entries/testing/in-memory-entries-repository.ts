import type { Entry } from '../domain/entry';
import type { EntriesRepository } from '../ports/entries-repository';

const sameSource = (a: Entry, b: Entry): boolean =>
  a.source.messageId === b.source.messageId && a.source.toolUseId === b.source.toolUseId;

export const inMemoryEntriesRepository = (seed: readonly Entry[] = []): EntriesRepository => {
  const rows = new Map(seed.map((entry) => [entry.id, entry]));
  return {
    findById: async (userId, id) => {
      const entry = rows.get(id);
      return entry?.userId === userId ? entry : undefined;
    },
    insert: async (entry) => {
      if ([...rows.values()].some((row) => sameSource(row, entry))) return false;
      rows.set(entry.id, entry);
      return true;
    },
    correct: async ({ entry, expectedVersion }) => {
      if (rows.get(entry.id)?.version !== expectedVersion) return false;
      rows.set(entry.id, entry);
      return true;
    },
  };
};
