import { index, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { channel } from '../enums';
import { users } from '../users/users.table';

export const conversations = pgTable(
  'conversations',
  {
    id: uuid().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    channel: channel().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [index('conversations_user_created_idx').on(t.userId, t.createdAt)],
).enableRLS();

export type ConversationRow = typeof conversations.$inferSelect;
export type NewConversationRow = typeof conversations.$inferInsert;
