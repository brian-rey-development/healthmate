import { afterAll, describe, expect, it } from 'vitest';
import { connectTestDb, CREATED_AT, inRollback, LATER, seedEmptyConversation, seedUser } from '../test-utils';

const { db, close } = connectTestDb();
afterAll(close);

describe('conversations repository', () => {
  it('finds a conversation by id', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const conversation = await seedEmptyConversation(ctx, userId);

      expect(await ctx.repos.conversations.findById(userId, conversation.id)).toEqual(conversation);
    }));

  it('finds the latest conversation of a user in one channel', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      await seedEmptyConversation(ctx, userId, { createdAt: CREATED_AT });
      const newer = await seedEmptyConversation(ctx, userId, { createdAt: LATER });

      expect(await ctx.repos.conversations.findLatest(userId, 'telegram')).toEqual(newer);
    }));

  it('finds the latest conversation when the newer one was inserted first', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const newer = await seedEmptyConversation(ctx, userId, { createdAt: LATER });
      await seedEmptyConversation(ctx, userId, { createdAt: CREATED_AT });

      expect(await ctx.repos.conversations.findLatest(userId, 'telegram')).toEqual(newer);
    }));

  it('breaks a tie of the same creation time by the larger id', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const first = await seedEmptyConversation(ctx, userId);
      const second = await seedEmptyConversation(ctx, userId);

      const latest = await ctx.repos.conversations.findLatest(userId, 'telegram');
      expect(latest?.id).toBe([first.id, second.id].sort().at(-1));
    }));

  it('ignores a newer conversation of another channel', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const telegram = await seedEmptyConversation(ctx, userId, { createdAt: CREATED_AT });
      await seedEmptyConversation(ctx, userId, { channel: 'web', createdAt: LATER });

      expect(await ctx.repos.conversations.findLatest(userId, 'telegram')).toEqual(telegram);
    }));

  it('finds nothing in a channel without a conversation', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      await seedEmptyConversation(ctx, userId);

      expect(await ctx.repos.conversations.findLatest(userId, 'web')).toBeUndefined();
    }));

  it('does not find the conversation of another user by id', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      const conversation = await seedEmptyConversation(ctx, userId);

      expect(await ctx.repos.conversations.findById(otherId, conversation.id)).toBeUndefined();
    }));

  it('does not return the latest conversation of another user', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      await seedEmptyConversation(ctx, userId);

      expect(await ctx.repos.conversations.findLatest(otherId, 'telegram')).toBeUndefined();
    }));
});
