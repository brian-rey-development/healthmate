import { and, eq, sql } from 'drizzle-orm';
import type { Executor } from '../executor';
import { first } from '../rows';
import { entries, type EntryRow, type NewEntryRow } from './entries.table';

export type EntryChanges = Partial<
  Pick<
    NewEntryRow,
    | 'subjectId'
    | 'kind'
    | 'value'
    | 'originalWords'
    | 'startDate'
    | 'startPrecision'
    | 'startTime'
    | 'endDate'
    | 'endTime'
    | 'timeZone'
  >
>;

export type EntrySource = Pick<NewEntryRow, 'sourceMessageId' | 'sourceToolUseId'>;

export type EntryCorrection = {
  readonly userId: string;
  readonly id: string;
  readonly expectedVersion: number;
  readonly source: EntrySource;
  readonly updatedAt: Date;
  readonly changes: EntryChanges;
};

const owned = (userId: string, id: string) => and(eq(entries.userId, userId), eq(entries.id, id));

const findById =
  (db: Executor) =>
  async (userId: string, id: string): Promise<EntryRow | undefined> =>
    first(await db.select().from(entries).where(owned(userId, id)));

// Undefined means the source message or tool_use already made an entry, so a second confirm writes nothing.
const insert =
  (db: Executor) =>
  async (row: NewEntryRow): Promise<EntryRow | undefined> =>
    first(await db.insert(entries).values(row).onConflictDoNothing().returning());

// Optimistic concurrency. Undefined means the entry is missing or another correction came first.
const correct =
  (db: Executor) =>
  async (correction: EntryCorrection): Promise<EntryRow | undefined> => {
    const { userId, id, expectedVersion, source, updatedAt, changes } = correction;
    return first(
      await db
        .update(entries)
        .set({ ...changes, ...source, updatedAt, version: sql`${entries.version} + 1` })
        .where(and(owned(userId, id), eq(entries.version, expectedVersion)))
        .returning(),
    );
  };

export const createEntriesRepository = (db: Executor) => ({
  findById: findById(db),
  insert: insert(db),
  correct: correct(db),
});
