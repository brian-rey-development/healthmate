import type { MessagesRepository } from '@healthmate/core';
import { and, asc, desc, eq, getTableColumns } from 'drizzle-orm';
import type { Executor } from '../executor';
import { first } from '../rows';
import { conversations } from './conversations.table';
import { messages } from './messages.table';

// A message row has the shape of the domain Message, so no mapper is needed.
const ownedBy = (userId: string) => eq(conversations.userId, userId);

const selectOwned = (db: Executor) =>
  db
    .select(getTableColumns(messages))
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id));

// The use case loads the conversation for its owner before it inserts a message.
const insert =
  (db: Executor): MessagesRepository['insert'] =>
  async (message) => {
    await db.insert(messages).values(message);
  };

const findById =
  (db: Executor): MessagesRepository['findById'] =>
  async (userId, id) =>
    first(await selectOwned(db).where(and(ownedBy(userId), eq(messages.id, id))));

// The model API answers every tool_use in the next turn, so only the last message can hold an open proposal.
const findLast =
  (db: Executor): MessagesRepository['findLast'] =>
  async (userId, conversationId) =>
    first(
      await selectOwned(db)
        .where(and(ownedBy(userId), eq(messages.conversationId, conversationId)))
        .orderBy(desc(messages.createdAt), desc(messages.id))
        .limit(1),
    );

const listForConversation =
  (db: Executor): MessagesRepository['listForConversation'] =>
  async (userId, conversationId) =>
    selectOwned(db)
      .where(and(ownedBy(userId), eq(messages.conversationId, conversationId)))
      .orderBy(asc(messages.createdAt), asc(messages.id));

export const createMessagesRepository = (db: Executor): MessagesRepository => ({
  insert: insert(db),
  findById: findById(db),
  findLast: findLast(db),
  listForConversation: listForConversation(db),
});
