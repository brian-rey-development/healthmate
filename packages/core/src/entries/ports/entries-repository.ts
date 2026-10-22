import type { Entry } from '../domain/entry';

export type SavedCorrection = { readonly entry: Entry; readonly expectedVersion: number; readonly updatedAt: Date };

export interface EntriesRepository {
  findById(userId: string, id: string): Promise<Entry | undefined>;
  // False when the source message or tool_use already made an entry.
  insert(entry: Entry, createdAt: Date): Promise<boolean>;
  // False when another correction saved first, so the expected version no longer matches.
  correct(correction: SavedCorrection): Promise<boolean>;
}
