import type { Conversation, ConversationsRepository } from '@healthmate/core';
import { and, desc, eq } from 'drizzle-orm';
import type { Executor } from '../executor';
import { first } from '../rows';
import { conversations, type ConversationRow } from './conversations.table';

const toConversation = ({ id, userId, channel }: ConversationRow): Conversation => ({ id, userId, channel });

const findById =
  (db: Executor): ConversationsRepository['findById'] =>
  async (userId, id) => {
    const owned = and(eq(conversations.userId, userId), eq(conversations.id, id));
    const row = first(await db.select().from(conversations).where(owned));
    return row && toConversation(row);
  };

const findLatest =
  (db: Executor): ConversationsRepository['findLatest'] =>
  async (userId, channel) => {
    const rows = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.userId, userId), eq(conversations.channel, channel)))
      .orderBy(desc(conversations.createdAt))
      .limit(1);
    const row = first(rows);
    return row && toConversation(row);
  };

const insert =
  (db: Executor): ConversationsRepository['insert'] =>
  async (conversation, createdAt) => {
    await db.insert(conversations).values({ ...conversation, createdAt });
  };

export const createConversationsRepository = (db: Executor): ConversationsRepository => ({
  findById: findById(db),
  findLatest: findLatest(db),
  insert: insert(db),
});
