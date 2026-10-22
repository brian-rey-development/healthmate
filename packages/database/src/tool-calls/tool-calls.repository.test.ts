import { afterAll, describe, expect, it } from 'vitest';
import {
  connectTestDb,
  CREATED_AT,
  expectViolation,
  inRollback,
  LATER,
  PG_ERROR,
  seedToolCall,
  seedUser,
  type TestContext,
} from '../test-utils';

const { db, close } = connectTestDb();
afterAll(close);

const PENDING = { status: 'pending', decidedAt: null } as const;

const confirm = (ctx: TestContext, userId: string, id: string) =>
  ctx.repos.toolCalls.decide({ userId, id, status: 'confirmed', decidedAt: LATER });

describe('tool calls repository', () => {
  it('confirms a pending proposal only once', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const proposal = await seedToolCall(ctx, userId, PENDING);

      expect(await confirm(ctx, userId, proposal.id)).toMatchObject({ status: 'confirmed', decidedAt: LATER });
      expect(await confirm(ctx, userId, proposal.id)).toBeUndefined();
      expect(await ctx.repos.toolCalls.listPending(userId)).toEqual([]);
    }));

  it('lists pending proposals oldest first', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const newer = await seedToolCall(ctx, userId, { ...PENDING, createdAt: LATER });
      const older = await seedToolCall(ctx, userId, { ...PENDING, createdAt: CREATED_AT });
      await seedToolCall(ctx, userId);

      expect((await ctx.repos.toolCalls.listPending(userId)).map((row) => row.id)).toEqual([older.id, newer.id]);
    }));

  it('does not let another user read or decide the proposal', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);
      const otherId = await seedUser(ctx);
      const proposal = await seedToolCall(ctx, userId, PENDING);

      expect(await confirm(ctx, otherId, proposal.id)).toBeUndefined();
      expect(await ctx.repos.toolCalls.findById(otherId, proposal.id)).toBeUndefined();
      expect(await ctx.repos.toolCalls.findById(userId, proposal.id)).toMatchObject(PENDING);
    }));

  it('rejects an agent call without a message', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);

      await expectViolation(ctx, PG_ERROR.checkViolation, (repos) =>
        seedToolCall({ ...ctx, repos }, userId, { madeBy: 'agent' }),
      );
    }));

  it('rejects a decided call without a decision time', () =>
    inRollback(db, async (ctx) => {
      const userId = await seedUser(ctx);

      await expectViolation(ctx, PG_ERROR.checkViolation, (repos) =>
        seedToolCall({ ...ctx, repos }, userId, { decidedAt: null }),
      );
    }));
});
