import type { Entry } from '../domain/entry';
import type { EntriesRepository } from '../ports/entries-repository';

export const inMemoryEntriesRepository = (seed: readonly Entry[] = []): EntriesRepository => {
  const rows = new Map(seed.map((entry) => [entry.id, entry]));
  return {
    findById: async (userId, id) => {
      const entry = rows.get(id);
      return entry?.userId === userId ? entry : undefined;
    },
    saveCorrection: async (entry, expectedVersion) => {
      if (rows.get(entry.id)?.version !== expectedVersion) return false;
      rows.set(entry.id, entry);
      return true;
    },
  };
};
