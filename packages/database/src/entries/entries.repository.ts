import type { EntriesRepository } from '@healthmate/core';
import { and, eq } from 'drizzle-orm';
import type { Executor } from '../executor';
import { first, wroteRow } from '../rows';
import { entries } from './entries.table';
import { toEntry, toStoredEntry } from './entry.mapper';

const owned = (userId: string, id: string) => and(eq(entries.userId, userId), eq(entries.id, id));

const findById =
  (db: Executor): EntriesRepository['findById'] =>
  async (userId, id) => {
    const row = first(await db.select().from(entries).where(owned(userId, id)));
    return row && toEntry(row);
  };

// False means the source message or tool_use already made an entry, so a second confirm writes nothing.
const insert =
  (db: Executor): EntriesRepository['insert'] =>
  async (entry, createdAt) => {
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
