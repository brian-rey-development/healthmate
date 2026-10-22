import type { EntryHistoryRepository, EntryVersion } from '@healthmate/core';
import { and, asc, eq } from 'drizzle-orm';
import type { Executor } from '../executor';
import { first } from '../rows';
import { toEntry } from './entry.mapper';
import { entryHistory, type EntryHistoryRow } from './entry-history.table';

const toEntryVersion = ({ entryId, recordedAt, ...row }: EntryHistoryRow): EntryVersion => ({
  ...toEntry({ ...row, id: entryId }),
  recordedAt,
});

const ownedEntry = (userId: string, entryId: string) =>
  and(eq(entryHistory.userId, userId), eq(entryHistory.entryId, entryId));

const listVersions =
  (db: Executor): EntryHistoryRepository['listVersions'] =>
  async (userId, entryId) => {
    const query = db.select().from(entryHistory).where(ownedEntry(userId, entryId));
    return (await query.orderBy(asc(entryHistory.version))).map(toEntryVersion);
  };

const findVersion =
  (db: Executor): EntryHistoryRepository['findVersion'] =>
  async ({ userId, entryId, version }) => {
    const matches = and(ownedEntry(userId, entryId), eq(entryHistory.version, version));
    const row = first(await db.select().from(entryHistory).where(matches));
    return row && toEntryVersion(row);
  };

export const createEntryHistoryRepository = (db: Executor): EntryHistoryRepository => ({
  listVersions: listVersions(db),
  findVersion: findVersion(db),
});
