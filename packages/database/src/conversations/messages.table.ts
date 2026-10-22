import type { ContentBlock } from '@healthmate/core';
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { messageRole } from '../enums';
import { conversations } from './conversations.table';

export const messages = pgTable(
  'messages',
  {
    id: uuid().primaryKey(),
    conversationId: uuid()
      .notNull()
      .references(() => conversations.id),
    role: messageRole().notNull(),
    content: jsonb().$type<readonly ContentBlock[]>().notNull(),
    transcript: text(),
    model: text(),
    promptVersion: text(),
    createdAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [index('messages_conversation_created_id_idx').on(t.conversationId, t.createdAt, t.id)],
).enableRLS();

export type MessageRow = typeof messages.$inferSelect;
export type NewMessageRow = typeof messages.$inferInsert;
