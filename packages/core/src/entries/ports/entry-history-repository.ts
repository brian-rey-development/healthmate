import type { EntryVersion } from '../domain/entry';

export type EntryVersionKey = { readonly userId: string; readonly entryId: string; readonly version: number };

export interface EntryHistoryRepository {
  // Newest version first. The limit is at least 1.
  listVersions(userId: string, entryId: string, limit: number): Promise<EntryVersion[]>;
  findVersion(key: EntryVersionKey): Promise<EntryVersion | undefined>;
}
