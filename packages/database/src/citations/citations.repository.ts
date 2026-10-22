import { and, asc, eq, getTableColumns } from 'drizzle-orm';
import { conversations } from '../conversations/conversations.table';
import { messages } from '../conversations/messages.table';
import type { Executor } from '../executor';
import { citations, type CitationRow, type NewCitationRow } from './citations.table';

// The agent checks in code that each cited entry came from a tool result of the same turn.
const insertMany =
  (db: Executor) =>
  async (rows: readonly NewCitationRow[]): Promise<void> => {
    if (rows.length === 0) return;
    await db.insert(citations).values([...rows]);
  };

const listForMessage =
  (db: Executor) =>
  async (userId: string, messageId: string): Promise<CitationRow[]> =>
    db
      .select(getTableColumns(citations))
      .from(citations)
      .innerJoin(messages, eq(citations.messageId, messages.id))
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(eq(conversations.userId, userId), eq(citations.messageId, messageId)))
      .orderBy(asc(citations.entryId), asc(citations.version));

export const createCitationsRepository = (db: Executor) => ({
  insertMany: insertMany(db),
  listForMessage: listForMessage(db),
});
