import { and, asc, eq, sql } from 'drizzle-orm';
import type { ToolCallStatus } from '../enums';
import type { Executor } from '../executor';
import { first, single } from '../rows';
import { toolCalls, type NewToolCallRow, type ToolCallRow } from './tool-calls.table';

export type ToolCallDecision = {
  readonly userId: string;
  readonly id: string;
  readonly status: Exclude<ToolCallStatus, 'pending' | 'done'>;
  readonly decidedAt: Date;
};

// A literal, not a bind parameter, so a generic prepared plan can still use the partial index.
const isPending = sql`${toolCalls.status} = 'pending'`;

const owned = (userId: string, id: string) => and(eq(toolCalls.userId, userId), eq(toolCalls.id, id));

const findById =
  (db: Executor) =>
  async (userId: string, id: string): Promise<ToolCallRow | undefined> =>
    first(await db.select().from(toolCalls).where(owned(userId, id)));

const listPending =
  (db: Executor) =>
  async (userId: string): Promise<ToolCallRow[]> =>
    db
      .select()
      .from(toolCalls)
      .where(and(eq(toolCalls.userId, userId), isPending))
      .orderBy(asc(toolCalls.createdAt), asc(toolCalls.id));

// A read tool call is inserted with status done, so it never passes through decide.
const insert =
  (db: Executor) =>
  async (row: NewToolCallRow): Promise<ToolCallRow> =>
    single(await db.insert(toolCalls).values(row).returning());

// Changes pending to the new status at most once. Undefined means the call is missing or already decided.
const decide =
  (db: Executor) =>
  async ({ userId, id, status, decidedAt }: ToolCallDecision): Promise<ToolCallRow | undefined> =>
    first(
      await db
        .update(toolCalls)
        .set({ status, decidedAt })
        .where(and(owned(userId, id), isPending))
        .returning(),
    );

export const createToolCallsRepository = (db: Executor) => ({
  findById: findById(db),
  listPending: listPending(db),
  insert: insert(db),
  decide: decide(db),
});
