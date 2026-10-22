import type { EntryHistoryRepository, EntryVersion } from '@healthmate/core';
import { and, desc, eq } from 'drizzle-orm';
import type { Executor } from '../executor';
import { first, requireLimit } from '../rows';
import { toEntry } from './entry.mapper';
import { entryHistory, type EntryHistoryRow } from './entry-history.table';

const toEntryVersion = ({ entryId, recordedAt, ...row }: EntryHistoryRow): EntryVersion => ({
  ...toEntry({ ...row, id: entryId }),
  recordedAt,
});

const owned = (userId: string, entryId: string) =>
  and(eq(entryHistory.userId, userId), eq(entryHistory.entryId, entryId));

const listVersions =
  (db: Executor): EntryHistoryRepository['listVersions'] =>
  async (userId, entryId, limit) => {
    const rows = await db
      .select()
      .from(entryHistory)
      .where(owned(userId, entryId))
      .orderBy(desc(entryHistory.version))
      .limit(requireLimit(limit));
    return rows.map(toEntryVersion);
  };

const findVersion =
  (db: Executor): EntryHistoryRepository['findVersion'] =>
  async ({ userId, entryId, version }) => {
    const matches = and(owned(userId, entryId), eq(entryHistory.version, version));
    const row = first(await db.select().from(entryHistory).where(matches));
    return row && toEntryVersion(row);
  };

export const createEntryHistoryRepository = (db: Executor): EntryHistoryRepository => ({
  listVersions: listVersions(db),
  findVersion: findVersion(db),
});
