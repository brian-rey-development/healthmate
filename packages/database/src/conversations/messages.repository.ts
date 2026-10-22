import { and, asc, desc, eq, getTableColumns } from 'drizzle-orm';
import type { Executor } from '../executor';
import { first, single } from '../rows';
import { conversations } from './conversations.table';
import { messages, type MessageRow, type NewMessageRow } from './messages.table';

const ownedBy = (userId: string) => eq(conversations.userId, userId);

const selectOwned = (db: Executor) =>
  db
    .select(getTableColumns(messages))
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id));

// The use case loads the conversation for its owner before it inserts a message.
const insert =
  (db: Executor) =>
  async (row: NewMessageRow): Promise<MessageRow> =>
    single(await db.insert(messages).values(row).returning());

// Loads the message that holds a proposal, so a confirm can read the proposed entry.
const findById =
  (db: Executor) =>
  async (userId: string, id: string): Promise<MessageRow | undefined> =>
    first(await selectOwned(db).where(and(ownedBy(userId), eq(messages.id, id))));

// The model API answers every tool_use in the next turn, so only the last message can hold an open proposal.
const findLast =
  (db: Executor) =>
  async (userId: string, conversationId: string): Promise<MessageRow | undefined> =>
    first(
      await selectOwned(db)
        .where(and(ownedBy(userId), eq(messages.conversationId, conversationId)))
        .orderBy(desc(messages.createdAt), desc(messages.id))
        .limit(1),
    );

const listForConversation =
  (db: Executor) =>
  async (userId: string, conversationId: string): Promise<MessageRow[]> =>
    selectOwned(db)
      .where(and(ownedBy(userId), eq(messages.conversationId, conversationId)))
      .orderBy(asc(messages.createdAt), asc(messages.id));

export const createMessagesRepository = (db: Executor) => ({
  insert: insert(db),
  findById: findById(db),
  findLast: findLast(db),
  listForConversation: listForConversation(db),
});
