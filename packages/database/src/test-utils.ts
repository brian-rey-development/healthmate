import { randomUUID } from 'node:crypto';
import { sql, TransactionRollbackError } from 'drizzle-orm';
import { expect } from 'vitest';
import { createDb, type Database } from './client';
import type { NewMessageRow } from './conversations/messages.table';
import type { EntryRow, NewEntryRow } from './entries/entries.table';
import type { MessageRole } from './enums';
import { loadLocalEnv, requireEnv } from './env';
import type { Executor } from './executor';
import { assertLocalTarget } from './guard';
import { createRepositories, type Repositories } from './repositories';
import type { NewSubjectRow, SubjectRow } from './subjects/subjects.table';
import type { NewToolCallRow, ToolCallRow } from './tool-calls/tool-calls.table';

export const PG_ERROR = {
  uniqueViolation: '23505',
  foreignKeyViolation: '23503',
  checkViolation: '23514',
} as const;

export type PgErrorCode = (typeof PG_ERROR)[keyof typeof PG_ERROR];

export const CREATED_AT = new Date('2026-01-01T09:00:00Z');
export const LATER = new Date('2026-01-02T09:00:00Z');
const TIME_ZONE = 'Europe/Madrid';

export type TestContext = { readonly repos: Repositories; readonly tx: Executor };

export const connectTestDb = () => {
  loadLocalEnv();
  const url = requireEnv('DATABASE_URL');
  assertLocalTarget(url);
  return createDb(url);
};

export const inRollback = async (db: Database, work: (ctx: TestContext) => Promise<void>): Promise<void> => {
  try {
    await db.transaction(async (tx) => {
      await work({ repos: createRepositories(tx), tx });
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }
};

// A savepoint keeps the outer transaction usable after the expected error.
export const expectViolation = async (
  { tx }: TestContext,
  code: PgErrorCode,
  work: (repos: Repositories) => Promise<unknown>,
): Promise<void> => {
  await expect(tx.transaction((savepoint) => work(createRepositories(savepoint)))).rejects.toMatchObject({
    cause: { code },
  });
};

export const seedUser = async ({ repos, tx }: TestContext): Promise<string> => {
  const id = randomUUID();
  await tx.execute(sql`insert into auth.users (id) values (${id})`);
  await repos.users.insert({ id, displayName: 'Synthetic Sam', createdAt: CREATED_AT });
  return id;
};

export const seedSubject = ({ repos }: TestContext, row: Pick<NewSubjectRow, 'userId' | 'name'>): Promise<SubjectRow> =>
  repos.subjects.insert({ id: randomUUID(), kind: 'symptom', createdAt: CREATED_AT, ...row });

export const seedToolCall = (
  { repos }: TestContext,
  userId: string,
  overrides: Partial<NewToolCallRow> = {},
): Promise<ToolCallRow> =>
  repos.toolCalls.insert({
    id: randomUUID(),
    userId,
    name: 'propose_entry',
    input: {},
    status: 'confirmed',
    madeBy: 'person',
    decidedAt: CREATED_AT,
    createdAt: CREATED_AT,
    ...overrides,
  });

export const noteEntry = (userId: string, toolCallId: string, overrides: Partial<NewEntryRow> = {}): NewEntryRow => ({
  id: randomUUID(),
  userId,
  toolCallId,
  kind: 'note',
  value: {},
  originalWords: 'slept badly',
  startDate: '2026-01-01',
  startPrecision: 'day',
  timeZone: TIME_ZONE,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  ...overrides,
});

export const seedEntry = async (
  ctx: TestContext,
  userId: string,
  overrides: Partial<NewEntryRow> = {},
): Promise<EntryRow> => {
  const toolCall = await seedToolCall(ctx, userId);
  return ctx.repos.entries.insert(noteEntry(userId, toolCall.id, overrides));
};

const textMessage = (conversationId: string, role: MessageRole, text: string, createdAt: Date): NewMessageRow => ({
  id: randomUUID(),
  conversationId,
  role,
  content: [{ type: 'text', text }],
  createdAt,
});

export const seedConversation = async ({ repos }: TestContext, userId: string) => {
  const conversation = await repos.conversations.insert({
    id: randomUUID(),
    userId,
    channel: 'telegram',
    createdAt: CREATED_AT,
  });
  const answer = await repos.messages.insert({
    ...textMessage(conversation.id, 'assistant', 'One note this week.', LATER),
    model: 'claude-sonnet-5-5',
    promptVersion: 'answer-v1',
  });
  const question = await repos.messages.insert(textMessage(conversation.id, 'user', 'How was my week?', CREATED_AT));
  return { conversation, question, answer };
};
