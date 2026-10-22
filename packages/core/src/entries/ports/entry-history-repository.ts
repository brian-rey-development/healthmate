import type { EntryVersion } from '../domain/entry';

export type EntryVersionKey = { readonly userId: string; readonly entryId: string; readonly version: number };

export interface EntryHistoryRepository {
  listVersions(userId: string, entryId: string): Promise<EntryVersion[]>;
  findVersion(key: EntryVersionKey): Promise<EntryVersion | undefined>;
}
