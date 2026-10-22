import type { EntriesRepository, EntrySource } from '@healthmate/core';
import { and, eq, sql } from 'drizzle-orm';
import type { Executor } from '../executor';
import { first, wroteRow } from '../rows';
import { entries } from './entries.table';
import { toEntry, toStoredEntry } from './entry.mapper';
import { entryHistory } from './entry-history.table';

const owned = (userId: string, id: string) => and(eq(entries.userId, userId), eq(entries.id, id));

const findById =
  (db: Executor): EntriesRepository['findById'] =>
  async (userId, id) => {
    const row = first(await db.select().from(entries).where(owned(userId, id)));
    return row && toEntry(row);
  };

// entry_history keeps the source of every version, so a proposal stays used after a correction replaces it here.
const sourceUsed = async (db: Executor, { messageId, toolUseId }: EntrySource): Promise<boolean> => {
  const sameSource = and(
    eq(entryHistory.sourceMessageId, messageId),
    sql`${entryHistory.sourceToolUseId} is not distinct from ${toolUseId}`,
  );
  const rows = await db.select({ entryId: entryHistory.entryId }).from(entryHistory).where(sameSource).limit(1);
  return rows.length > 0;
};

// False means the source already made a version of an entry. The conflict clause covers 2 confirms at the same time.
const insert =
  (db: Executor): EntriesRepository['insert'] =>
  async (entry, createdAt) => {
    if (await sourceUsed(db, entry.source)) return false;
    const row = { ...toStoredEntry(entry), createdAt, updatedAt: createdAt };
    return wroteRow(await db.insert(entries).values(row).onConflictDoNothing().returning({ id: entries.id }));
  };

// Optimistic concurrency. Core sets the next version, and the write only lands on the expected one.
const correct =
  (db: Executor): EntriesRepository['correct'] =>
  async ({ entry, expectedVersion, updatedAt }) => {
    const { id, userId, ...columns } = toStoredEntry(entry);
    const matches = and(owned(userId, id), eq(entries.version, expectedVersion));
    return wroteRow(
      await db
        .update(entries)
        .set({ ...columns, updatedAt })
        .where(matches)
        .returning({ id: entries.id }),
    );
  };

export const createEntriesRepository = (db: Executor): EntriesRepository => ({
  findById: findById(db),
  insert: insert(db),
  correct: correct(db),
});
