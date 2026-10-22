import { foreignKey, index, integer, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { messages } from '../conversations/messages.table';
import { entryHistory } from '../entries/entry-history.table';

export const citations = pgTable(
  'citations',
  {
    messageId: uuid()
      .notNull()
      .references(() => messages.id),
    entryId: uuid().notNull(),
    version: integer().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.messageId, t.entryId, t.version] }),
    foreignKey({
      name: 'citations_entry_version_fk',
      columns: [t.entryId, t.version],
      foreignColumns: [entryHistory.entryId, entryHistory.version],
    }),
    index('citations_entry_version_idx').on(t.entryId, t.version),
  ],
).enableRLS();

export type CitationRow = typeof citations.$inferSelect;
export type NewCitationRow = typeof citations.$inferInsert;
