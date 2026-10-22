import { afterAll, describe, expect, it } from 'vitest';
import { connectTestDb, inRollback, seedConversation, seedUser } from '../test-utils';

const { db, close } = connectTestDb();
afterAll(close);

describe('messages repository', () => {
  it('lists the messages of a conversation in time order', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { conversation, question, answer } = await seedConversation(ctx, userId);

      const listed = await ctx.repos.messages.listForConversation(userId, conversation.id);
      expect(listed.map((row) => row.id)).toEqual([question.id, answer.id]);
    }));

  it('lists nothing for another user', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      const { conversation } = await seedConversation(ctx, userId);

      expect(await ctx.repos.messages.listForConversation(otherId, conversation.id)).toEqual([]);
    }));
});
