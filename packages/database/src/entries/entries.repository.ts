import type { EntriesRepository, EntrySource } from '@healthmate/core';
import { and, eq, isNull, sql } from 'drizzle-orm';
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

const sameSource = ({ messageId, toolUseId }: EntrySource) =>
  and(
    eq(entryHistory.sourceMessageId, messageId),
    toolUseId === null ? isNull(entryHistory.sourceToolUseId) : eq(entryHistory.sourceToolUseId, toolUseId),
  );

// entry_history keeps the source of every version, so a proposal stays used after a correction replaces it here.
const sourceUsed = async (db: Executor, source: EntrySource): Promise<boolean> => {
  const rows = await db.select({ entryId: entryHistory.entryId }).from(entryHistory).where(sameSource(source)).limit(1);
  return rows.length > 0;
};

// The conflict clause covers 2 confirms of one proposal at the same time. A duplicate id is a bug and throws.
const insert =
  (db: Executor): EntriesRepository['insert'] =>
  async (entry, createdAt) => {
    if (await sourceUsed(db, entry.source)) return false;
    const row = { ...toStoredEntry(entry), createdAt, updatedAt: createdAt };
    const target = [entries.sourceMessageId, entries.sourceToolUseId];
    return wroteRow(await db.insert(entries).values(row).onConflictDoNothing({ target }).returning({ id: entries.id }));
  };

// The stored version is the only authority. The write lands on version - 1 and SQL adds 1.
// A source that any version used fails on the entry_history unique index, so the trigger throws.
const correct =
  (db: Executor): EntriesRepository['correct'] =>
  async ({ entry, updatedAt }) => {
    const { id, userId, version, ...columns } = toStoredEntry(entry);
    const matches = and(owned(userId, id), eq(entries.version, version - 1));
    return wroteRow(
      await db
        .update(entries)
        .set({ ...columns, version: sql`${entries.version} + 1`, updatedAt })
        .where(matches)
        .returning({ id: entries.id }),
    );
  };

export const createEntriesRepository = (db: Executor): EntriesRepository => ({
  findById: findById(db),
  insert: insert(db),
  correct: correct(db),
});
