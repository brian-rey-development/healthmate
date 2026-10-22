import { integer, pgTable, primaryKey, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { toolCalls } from '../tool-calls/tool-calls.table';
import { entries } from './entries.table';
import { entryDataColumns } from './entry-data.columns';

// Only the entries_copy_to_history trigger writes here. A snapshot, so user_id and subject_id have no foreign keys.
export const entryHistory = pgTable(
  'entry_history',
  {
    entryId: uuid()
      .notNull()
      .references(() => entries.id),
    version: integer().notNull(),
    toolCallId: text()
      .notNull()
      .references(() => toolCalls.id),
    userId: uuid().notNull(),
    ...entryDataColumns(),
    recordedAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.entryId, t.version] }),
    unique('entry_history_tool_call_id_unique').on(t.toolCallId),
  ],
).enableRLS();

export type EntryHistoryRow = typeof entryHistory.$inferSelect;
