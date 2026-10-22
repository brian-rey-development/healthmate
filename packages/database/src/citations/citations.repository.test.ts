import { afterAll, describe, expect, it } from 'vitest';
import {
  connectTestDb,
  expectViolation,
  inRollback,
  PG_ERROR,
  seedConversationWithMessages,
  seedNote,
  seedUser,
} from '../test-utils';

const { db, close } = connectTestDb();
afterAll(close);

const LIST_LIMIT = 50;

describe('citations repository', () => {
  it('links an answer to an exact entry version', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { answer } = await seedConversationWithMessages(ctx, userId);
      const note = await seedNote(ctx, userId);
      const citation = { messageId: answer.id, entryId: note.id, version: 1 };

      await ctx.repos.citations.insertMany([citation]);
      expect(await ctx.repos.citations.listForMessage(userId, answer.id, LIST_LIMIT)).toEqual([citation]);
    }));

  it('lists citations ordered by entry id, then version', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { answer } = await seedConversationWithMessages(ctx, userId);
      const notes = [await seedNote(ctx, userId), await seedNote(ctx, userId)];
      const citations = notes.map(({ id }) => ({ messageId: answer.id, entryId: id, version: 1 }));

      await ctx.repos.citations.insertMany(citations);
      const listed = await ctx.repos.citations.listForMessage(userId, answer.id, LIST_LIMIT);
      expect(listed.map((citation) => citation.entryId)).toEqual(notes.map(({ id }) => id).sort());
    }));

  it('returns at most the limit', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { answer } = await seedConversationWithMessages(ctx, userId);
      const notes = [await seedNote(ctx, userId), await seedNote(ctx, userId)];
      await ctx.repos.citations.insertMany(notes.map(({ id }) => ({ messageId: answer.id, entryId: id, version: 1 })));

      expect(await ctx.repos.citations.listForMessage(userId, answer.id, 1)).toHaveLength(1);
    }));

  it.each([0, -1, 1.5])('rejects the limit %s', (limit) =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { answer } = await seedConversationWithMessages(ctx, userId);

      await expect(ctx.repos.citations.listForMessage(userId, answer.id, limit)).rejects.toThrow(RangeError);
    }),
  );

  it('writes nothing for an empty list', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { answer } = await seedConversationWithMessages(ctx, userId);

      await ctx.repos.citations.insertMany([]);
      expect(await ctx.repos.citations.listForMessage(userId, answer.id, LIST_LIMIT)).toEqual([]);
    }));

  it('keeps one row when the same citation is inserted twice', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { answer } = await seedConversationWithMessages(ctx, userId);
      const note = await seedNote(ctx, userId);
      const citation = { messageId: answer.id, entryId: note.id, version: 1 };

      await ctx.repos.citations.insertMany([citation]);
      await ctx.repos.citations.insertMany([citation, citation]);
      expect(await ctx.repos.citations.listForMessage(userId, answer.id, LIST_LIMIT)).toEqual([citation]);
    }));

  it('lists nothing for another user', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      const { answer } = await seedConversationWithMessages(ctx, userId);
      const note = await seedNote(ctx, userId);

      await ctx.repos.citations.insertMany([{ messageId: answer.id, entryId: note.id, version: 1 }]);
      expect(await ctx.repos.citations.listForMessage(otherId, answer.id, LIST_LIMIT)).toEqual([]);
    }));

  it('rejects a citation of a version that does not exist', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const { answer } = await seedConversationWithMessages(ctx, userId);
      const note = await seedNote(ctx, userId);

      await expectViolation(ctx, PG_ERROR.foreignKeyViolation, ({ repos }) =>
        repos.citations.insertMany([{ messageId: answer.id, entryId: note.id, version: 2 }]),
      );
    }));
});
