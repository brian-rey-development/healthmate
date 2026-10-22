import { and, asc, eq } from 'drizzle-orm';
import type { Executor } from '../executor';
import { first } from '../rows';
import { entryHistory, type EntryHistoryRow } from './entry-history.table';

export type EntryVersionKey = {
  readonly userId: string;
  readonly entryId: string;
  readonly version: number;
};

const ownedEntry = (userId: string, entryId: string) =>
  and(eq(entryHistory.userId, userId), eq(entryHistory.entryId, entryId));

const listVersions =
  (db: Executor) =>
  async (userId: string, entryId: string): Promise<EntryHistoryRow[]> =>
    db.select().from(entryHistory).where(ownedEntry(userId, entryId)).orderBy(asc(entryHistory.version));

const findVersion =
  (db: Executor) =>
  async ({ userId, entryId, version }: EntryVersionKey): Promise<EntryHistoryRow | undefined> =>
    first(
      await db
        .select()
        .from(entryHistory)
        .where(and(ownedEntry(userId, entryId), eq(entryHistory.version, version))),
    );

export const createEntryHistoryRepository = (db: Executor) => ({
  listVersions: listVersions(db),
  findVersion: findVersion(db),
});
