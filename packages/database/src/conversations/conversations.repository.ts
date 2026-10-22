import { and, desc, eq } from 'drizzle-orm';
import type { Channel } from '../enums';
import type { Executor } from '../executor';
import { first, single } from '../rows';
import { conversations, type ConversationRow, type NewConversationRow } from './conversations.table';

const findById =
  (db: Executor) =>
  async (userId: string, id: string): Promise<ConversationRow | undefined> =>
    first(
      await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.userId, userId), eq(conversations.id, id))),
    );

const findLatest =
  (db: Executor) =>
  async (userId: string, channel: Channel): Promise<ConversationRow | undefined> =>
    first(
      await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.userId, userId), eq(conversations.channel, channel)))
        .orderBy(desc(conversations.createdAt))
        .limit(1),
    );

const insert =
  (db: Executor) =>
  async (row: NewConversationRow): Promise<ConversationRow> =>
    single(await db.insert(conversations).values(row).returning());

export const createConversationsRepository = (db: Executor) => ({
  findById: findById(db),
  findLatest: findLatest(db),
  insert: insert(db),
});
