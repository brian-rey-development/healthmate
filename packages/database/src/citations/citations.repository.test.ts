import { afterAll, describe, expect, it } from 'vitest';
import {
  connectTestDb,
  expectViolation,
  inRollback,
  PG_ERROR,
  seedConversation,
  seedEntry,
  seedUser,
} from '../test-utils';

const { db, close } = connectTestDb();
afterAll(close);

describe('citations repository', () => {
  it('links an answer to an exact entry version', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { answer } = await seedConversation(ctx, userId);
      const note = await seedEntry(ctx, userId);
      const citation = { messageId: answer.id, entryId: note.id, version: 1 };

      await ctx.repos.citations.insertMany([citation]);
      expect(await ctx.repos.citations.listForMessage(userId, answer.id)).toEqual([citation]);
    }));

  it('lists nothing for another user', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      const { answer } = await seedConversation(ctx, userId);
      const note = await seedEntry(ctx, userId);

      await ctx.repos.citations.insertMany([{ messageId: answer.id, entryId: note.id, version: 1 }]);
      expect(await ctx.repos.citations.listForMessage(otherId, answer.id)).toEqual([]);
    }));

  it('rejects a citation of a version that does not exist', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { answer } = await seedConversation(ctx, userId);
      const note = await seedEntry(ctx, userId);

      await expectViolation(ctx, PG_ERROR.foreignKeyViolation, (repos) =>
        repos.citations.insertMany([{ messageId: answer.id, entryId: note.id, version: 2 }]),
      );
    }));
});
