import { and, asc, eq, getTableColumns } from 'drizzle-orm';
import type { Executor } from '../executor';
import { single } from '../rows';
import { conversations } from './conversations.table';
import { messages, type MessageRow, type NewMessageRow } from './messages.table';

// The use case loads the conversation for its owner before it inserts a message.
const insert =
  (db: Executor) =>
  async (row: NewMessageRow): Promise<MessageRow> =>
    single(await db.insert(messages).values(row).returning());

const listForConversation =
  (db: Executor) =>
  async (userId: string, conversationId: string): Promise<MessageRow[]> =>
    db
      .select(getTableColumns(messages))
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(eq(conversations.userId, userId), eq(messages.conversationId, conversationId)))
      .orderBy(asc(messages.createdAt), asc(messages.id));

export const createMessagesRepository = (db: Executor) => ({
  insert: insert(db),
  listForConversation: listForConversation(db),
});
