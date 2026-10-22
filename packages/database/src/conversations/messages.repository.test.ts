import { afterAll, describe, expect, it } from 'vitest';
import {
  buildTextMessage,
  connectTestDb,
  CREATED_AT,
  inRollback,
  LATER,
  seedConversationWithMessages,
  seedEmptyConversation,
  seedUser,
  type TestContext,
} from '../test-utils';

const { db, close } = connectTestDb();
afterAll(close);

const LIST_LIMIT = 50;

const seedTiedMessages = async (ctx: TestContext, userId: string) => {
  const conversation = await seedEmptyConversation(ctx, userId);
  const messages = [1, 2, 3].map((n) => buildTextMessage(conversation.id, 'user', `Tied ${n}`, CREATED_AT));
  for (const message of messages) await ctx.repos.messages.insert(message);
  return { conversation, messages, ids: messages.map((message) => message.id).sort() };
};

describe('messages repository', () => {
  it('finds a message by id', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { answer } = await seedConversationWithMessages(ctx, userId);

      expect(await ctx.repos.messages.findById(userId, answer.id)).toEqual(answer);
    }));

  it('does not find the message of another user by id', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      const { answer } = await seedConversationWithMessages(ctx, userId);

      expect(await ctx.repos.messages.findById(otherId, answer.id)).toBeUndefined();
    }));

  it('finds the newest message of a conversation, where an open proposal can be', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { conversation, answer } = await seedConversationWithMessages(ctx, userId);

      expect(await ctx.repos.messages.findLatest(userId, conversation.id)).toEqual(answer);
    }));

  it('finds the newest message of the asked conversation when the user has 2', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { conversation, answer } = await seedConversationWithMessages(ctx, userId);
      const other = await seedEmptyConversation(ctx, userId);
      await ctx.repos.messages.insert(buildTextMessage(other.id, 'user', 'Newer elsewhere', new Date('2026-02-01T00:00:00Z')));

      expect(await ctx.repos.messages.findLatest(userId, conversation.id)).toEqual(answer);
    }));

  it('breaks a tie of the same creation time by the larger id', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { conversation, ids } = await seedTiedMessages(ctx, userId);

      expect((await ctx.repos.messages.findLatest(userId, conversation.id))?.id).toBe(ids.at(-1));
    }));

  it('finds no latest message in a conversation of another user', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      const { conversation } = await seedConversationWithMessages(ctx, userId);

      expect(await ctx.repos.messages.findLatest(otherId, conversation.id)).toBeUndefined();
    }));

  it('lists the messages of a conversation oldest first', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { conversation, question, answer } = await seedConversationWithMessages(ctx, userId);

      const listed = await ctx.repos.messages.listLatest(userId, conversation.id, LIST_LIMIT);
      expect(listed).toEqual([question, answer]);
    }));

  it('lists only the newest messages up to the limit, still oldest first', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { conversation, messages, ids } = await seedTiedMessages(ctx, userId);
      const newest = buildTextMessage(conversation.id, 'assistant', 'Newest', LATER);
      await ctx.repos.messages.insert(newest);

      const listed = await ctx.repos.messages.listLatest(userId, conversation.id, 2);
      expect(listed).toEqual([messages.find((message) => message.id === ids.at(-1)), newest]);
    }));

  it('orders messages with the same creation time by id', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { conversation, ids } = await seedTiedMessages(ctx, userId);

      const listed = await ctx.repos.messages.listLatest(userId, conversation.id, LIST_LIMIT);
      expect(listed.map((message) => message.id)).toEqual(ids);
    }));

  it('lists only the messages of the asked conversation', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { conversation, question, answer } = await seedConversationWithMessages(ctx, userId);
      await seedConversationWithMessages(ctx, userId);

      const listed = await ctx.repos.messages.listLatest(userId, conversation.id, LIST_LIMIT);
      expect(listed).toEqual([question, answer]);
    }));

  it('lists nothing for another user', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      const { conversation } = await seedConversationWithMessages(ctx, userId);

      expect(await ctx.repos.messages.listLatest(otherId, conversation.id, LIST_LIMIT)).toEqual([]);
    }));

  it.each([0, -1, 1.5])('rejects the limit %s', (limit) =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { conversation } = await seedConversationWithMessages(ctx, userId);

      await expect(ctx.repos.messages.listLatest(userId, conversation.id, limit)).rejects.toThrow(RangeError);
    }),
  );
});
