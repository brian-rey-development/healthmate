import type { MessagesRepository } from '@healthmate/core';
import { and, desc, eq, getTableColumns } from 'drizzle-orm';
import type { Executor } from '../executor';
import { first, requireLimit } from '../rows';
import { conversations } from './conversations.table';
import { messages } from './messages.table';

const owned = (userId: string) => eq(conversations.userId, userId);

const inConversation = (userId: string, conversationId: string) =>
  and(owned(userId), eq(messages.conversationId, conversationId));

// A message row has the shape of the domain Message, so no mapper is needed.
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
    first(await selectOwned(db).where(and(owned(userId), eq(messages.id, id))));

// The model API answers every tool_use in the next turn, so only the latest message can hold an open proposal.
const findLatest =
  (db: Executor): MessagesRepository['findLatest'] =>
  async (userId, conversationId) =>
    first(
      await selectOwned(db)
        .where(inConversation(userId, conversationId))
        .orderBy(desc(messages.createdAt), desc(messages.id))
        .limit(1),
    );

const listLatest =
  (db: Executor): MessagesRepository['listLatest'] =>
  async (userId, conversationId, limit) => {
    const newestFirst = await selectOwned(db)
      .where(inConversation(userId, conversationId))
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(requireLimit(limit));
    return newestFirst.toReversed();
  };

export const createMessagesRepository = (db: Executor): MessagesRepository => ({
  insert: insert(db),
  findById: findById(db),
  findLatest: findLatest(db),
  listLatest: listLatest(db),
});
