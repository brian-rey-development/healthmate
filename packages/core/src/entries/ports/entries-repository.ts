import type { Entry } from '../domain/entry';

export interface EntriesRepository {
  findById(userId: string, id: string): Promise<Entry | undefined>;
  // False when another correction saved first, so the expected version no longer matches.
  saveCorrection(entry: Entry, expectedVersion: number, updatedAt: Date): Promise<boolean>;
}
