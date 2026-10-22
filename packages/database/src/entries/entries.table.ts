import { sql } from 'drizzle-orm';
import { check, foreignKey, index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { messages } from '../conversations/messages.table';
import { subjects } from '../subjects/subjects.table';
import { users } from '../users/users.table';
import { entryDataColumns } from './entry-data.columns';

export const entries = pgTable(
  'entries',
  {
    id: uuid().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    ...entryDataColumns(),
    sourceMessageId: uuid()
      .notNull()
      .references(() => messages.id),
    sourceToolUseId: text(),
    version: integer().notNull().default(1),
    createdAt: timestamp({ withTimezone: true }).notNull(),
    updatedAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    foreignKey({
      name: 'entries_subject_kind_fk',
      columns: [t.subjectId, t.kind],
      foreignColumns: [subjects.id, subjects.kind],
    }),
    unique('entries_source_unique').on(t.sourceMessageId, t.sourceToolUseId).nullsNotDistinct(),
    index('entries_user_start_idx').on(t.userId, t.startDate),
    index('entries_user_subject_start_idx').on(t.userId, t.subjectId, t.startDate),
    check('entries_subject_matches_kind', sql`(${t.kind} = 'note') = (${t.subjectId} is null)`),
    check('entries_version_positive', sql`${t.version} >= 1`),
    check('entries_start_time_needs_day', sql`${t.startTime} is null or ${t.startPrecision} = 'day'`),
    check('entries_end_time_needs_end_date', sql`${t.endTime} is null or ${t.endDate} is not null`),
    check('entries_end_after_start', sql`${t.endDate} is null or ${t.endDate} >= ${t.startDate}`),
  ],
).enableRLS();

export type EntryRow = typeof entries.$inferSelect;
export type NewEntryRow = typeof entries.$inferInsert;
