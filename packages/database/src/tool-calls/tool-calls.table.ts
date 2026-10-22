import { sql } from 'drizzle-orm';
import { check, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { messages } from '../conversations/messages.table';
import { toolCallMaker, toolCallStatus } from '../enums';
import { users } from '../users/users.table';

export const toolCalls = pgTable(
  'tool_calls',
  {
    // Text, because the agent keeps the tool_use id of the model API.
    id: text().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    messageId: uuid().references(() => messages.id),
    name: text().notNull(),
    input: jsonb().$type<Readonly<Record<string, unknown>>>().notNull(),
    status: toolCallStatus().notNull(),
    madeBy: toolCallMaker().notNull(),
    decidedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    index('tool_calls_message_idx').on(t.messageId),
    index('tool_calls_pending_idx')
      .on(t.userId, t.createdAt)
      .where(sql`${t.status} = 'pending'`),
    check('tool_calls_decided_unless_pending', sql`(${t.status} = 'pending') = (${t.decidedAt} is null)`),
    check('tool_calls_agent_has_message', sql`(${t.madeBy} = 'agent') = (${t.messageId} is not null)`),
  ],
).enableRLS();

export type ToolCallRow = typeof toolCalls.$inferSelect;
export type NewToolCallRow = typeof toolCalls.$inferInsert;
