import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { messageRole } from '../enums';
import { conversations } from './conversations.table';

// Snake case on purpose. The blocks keep the shape of the model API, so they go back to the model unchanged.
export type ContentBlock =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'tool_use'; readonly id: string; readonly name: string; readonly input: unknown }
  | {
      readonly type: 'tool_result';
      readonly tool_use_id: string;
      readonly content: unknown;
      readonly is_error?: boolean;
    };

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
  (t) => [index('messages_conversation_created_idx').on(t.conversationId, t.createdAt)],
).enableRLS();

export type MessageRow = typeof messages.$inferSelect;
export type NewMessageRow = typeof messages.$inferInsert;
