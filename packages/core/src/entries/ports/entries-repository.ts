import type { Entry } from '../domain/entry';

// The stored version of the entry must be entry.version - 1, so the version is the only expected version.
export type SavedCorrection = { readonly entry: Entry; readonly updatedAt: Date };

export interface EntriesRepository {
  findById(userId: string, id: string): Promise<Entry | undefined>;
  // False when the source message or tool_use already made any version of any entry. Throws when the id exists.
  insert(entry: Entry, createdAt: Date): Promise<boolean>;
  // Saves entry only when the entry of the same owner has the stored version entry.version - 1.
  // False when another correction saved first. Throws when any version already used entry.source, because a source is never reused.
  correct(correction: SavedCorrection): Promise<boolean>;
}
