import type { CitationsRepository } from '@healthmate/core';
import { and, asc, eq, getTableColumns } from 'drizzle-orm';
import { conversations } from '../conversations/conversations.table';
import { messages } from '../conversations/messages.table';
import type { Executor } from '../executor';
import { requireLimit } from '../rows';
import { citations } from './citations.table';

const owned = (userId: string, messageId: string) =>
  and(eq(conversations.userId, userId), eq(citations.messageId, messageId));

// The agent checks in code that each cited entry came from a tool result of the same turn.
const insertMany =
  (db: Executor): CitationsRepository['insertMany'] =>
  async (rows) => {
    if (rows.length === 0) return;
    const target = [citations.messageId, citations.entryId, citations.version];
    await db.insert(citations).values([...rows]).onConflictDoNothing({ target });
  };

const listForMessage =
  (db: Executor): CitationsRepository['listForMessage'] =>
  async (userId, messageId, limit) =>
    db
      .select(getTableColumns(citations))
      .from(citations)
      .innerJoin(messages, eq(citations.messageId, messages.id))
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(owned(userId, messageId))
      .orderBy(asc(citations.entryId), asc(citations.version))
      .limit(requireLimit(limit));

export const createCitationsRepository = (db: Executor): CitationsRepository => ({
  insertMany: insertMany(db),
  listForMessage: listForMessage(db),
});
