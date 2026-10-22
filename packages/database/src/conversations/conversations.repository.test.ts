import { afterAll, describe, expect, it } from 'vitest';
import { connectTestDb, inRollback, seedConversation, seedUser } from '../test-utils';

const { db, close } = connectTestDb();
afterAll(close);

describe('conversations repository', () => {
  it('finds the latest conversation of a user in one channel', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { conversation } = await seedConversation(ctx, userId);

      expect(await ctx.repos.conversations.findLatest(userId, 'telegram')).toEqual(conversation);
      expect(await ctx.repos.conversations.findLatest(userId, 'web')).toBeUndefined();
      expect(await ctx.repos.conversations.findById(userId, conversation.id)).toEqual(conversation);
    }));

  it('finds nothing for another user', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      const { conversation } = await seedConversation(ctx, userId);

      expect(await ctx.repos.conversations.findById(otherId, conversation.id)).toBeUndefined();
      expect(await ctx.repos.conversations.findLatest(otherId, 'telegram')).toBeUndefined();
    }));
});
