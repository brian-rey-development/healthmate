import { randomUUID } from 'node:crypto';
import { sql, TransactionRollbackError } from 'drizzle-orm';
import { expect } from 'vitest';
import { createDb, type Database } from './client';
import type { NewMessageRow } from './conversations/messages.table';
import type { EntrySource } from './entries/entries.repository';
import type { EntryRow, NewEntryRow } from './entries/entries.table';
import type { MessageRole } from './enums';
import { loadLocalEnv, requireEnv } from './env';
import type { Executor } from './executor';
import { assertLocalTarget } from './guard';
import { createRepositories, type Repositories } from './repositories';
import type { NewSubjectRow, SubjectRow } from './subjects/subjects.table';

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

// A proposal is a tool_use block in an assistant message. The entry points to that message and that tool_use id.
export const seedProposal = async ({ repos }: TestContext, userId: string): Promise<EntrySource> => {
  const conversation = await repos.conversations.insert({
    id: randomUUID(),
    userId,
    channel: 'telegram',
    createdAt: CREATED_AT,
  });
  const toolUseId = `toolu_${randomUUID()}`;
  const message = await repos.messages.insert({
    id: randomUUID(),
    conversationId: conversation.id,
    role: 'assistant',
    content: [{ type: 'tool_use', id: toolUseId, name: 'propose_entry', input: {} }],
    createdAt: CREATED_AT,
  });
  return { sourceMessageId: message.id, sourceToolUseId: toolUseId };
};

export const noteEntry = (userId: string, source: EntrySource, overrides: Partial<NewEntryRow> = {}): NewEntryRow => ({
  id: randomUUID(),
  userId,
  ...source,
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
  const source = await seedProposal(ctx, userId);
  const entry = await ctx.repos.entries.insert(noteEntry(userId, source, overrides));
  if (!entry) throw new Error('The seed entry was not inserted');
  return entry;
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
