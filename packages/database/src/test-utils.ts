import { randomUUID } from 'node:crypto';
import {
  createSeverity,
  type Conversation,
  type EntrySource,
  type Message,
  type MessageRole,
  type NoteEntry,
  type Severity,
  type Subject,
  type SymptomEntry,
} from '@healthmate/core';
import { sql, TransactionRollbackError } from 'drizzle-orm';
import { expect } from 'vitest';
import { createDb, type Database } from './client';
import { loadLocalEnv, requireEnv } from './env';
import type { Executor } from './executor';
import { assertLocalTarget } from './guard';
import { createRepositories, type Repositories } from './repositories';

export const PG_ERROR = {
  uniqueViolation: '23505',
  foreignKeyViolation: '23503',
  checkViolation: '23514',
} as const;

export type PgErrorCode = (typeof PG_ERROR)[keyof typeof PG_ERROR];

export const CREATED_AT = new Date('2026-01-01T09:00:00Z');
export const LATER = new Date('2026-01-02T09:00:00Z');
const TIME_ZONE = 'Europe/Madrid';
const TEST_POOL_SIZE = 2;

export type TestContext = { readonly repos: Repositories; readonly tx: Executor };

export const connectTestDb = () => {
  loadLocalEnv();
  const url = requireEnv('DATABASE_URL');
  assertLocalTarget(url);
  return createDb(url, { max: TEST_POOL_SIZE });
};

const contextOf = (tx: Executor): TestContext => ({ repos: createRepositories(tx), tx });

export const inRollback = async (db: Database, work: (ctx: TestContext) => Promise<void>): Promise<void> => {
  try {
    await db.transaction(async (tx) => {
      await work(contextOf(tx));
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
  work: (scope: TestContext) => Promise<unknown>,
): Promise<void> => {
  await expect(tx.transaction((savepoint) => work(contextOf(savepoint)))).rejects.toMatchObject({ cause: { code } });
};

export const severityOf = (value: number): Severity => {
  const result = createSeverity(value);
  if (!result.ok) throw new Error(`The test severity ${value} is invalid`);
  return result.value;
};

export const seedUser = async ({ repos, tx }: TestContext): Promise<string> => {
  const id = randomUUID();
  await tx.execute(sql`insert into auth.users (id) values (${id})`);
  await repos.users.insert({ id, displayName: 'Synthetic Sam' }, CREATED_AT);
  return id;
};

export const seedSubject = async ({ repos }: TestContext, owner: Pick<Subject, 'userId' | 'name'>): Promise<Subject> => {
  const subject: Subject = { id: randomUUID(), kind: 'symptom', ...owner };
  if (!(await repos.subjects.insert(subject, CREATED_AT))) throw new Error(`The seed subject ${owner.name} exists`);
  return subject;
};

export const buildMessage = (
  conversationId: string,
  role: MessageRole,
  content: Message['content'],
  createdAt: Date,
): Message => ({
  id: randomUUID(),
  conversationId,
  role,
  content,
  transcript: null,
  model: null,
  promptVersion: null,
  createdAt,
});

export const buildTextMessage = (conversationId: string, role: MessageRole, text: string, createdAt: Date): Message =>
  buildMessage(conversationId, role, [{ type: 'text', text }], createdAt);

export const seedEmptyConversation = async (
  { repos }: TestContext,
  userId: string,
  { createdAt = CREATED_AT, ...overrides }: Partial<Conversation> & { createdAt?: Date } = {},
): Promise<Conversation> => {
  const conversation: Conversation = { id: randomUUID(), userId, channel: 'telegram', ...overrides };
  await repos.conversations.insert(conversation, createdAt);
  return conversation;
};

// A proposal is a tool_use block in an assistant message. The entry points to that message and that tool_use id.
export const seedProposalMessage = async (ctx: TestContext, userId: string) => {
  const conversation = await seedEmptyConversation(ctx, userId);
  const toolUseId = `toolu_${randomUUID()}`;
  const toolUse = { type: 'tool_use', id: toolUseId, name: 'propose_entry', input: {} } as const;
  const proposal = buildMessage(conversation.id, 'assistant', [toolUse], CREATED_AT);
  await ctx.repos.messages.insert(proposal);
  return { conversationId: conversation.id, messageId: proposal.id, toolUseId };
};

export const seedEntrySource = async (ctx: TestContext, userId: string): Promise<EntrySource> => {
  const { messageId, toolUseId } = await seedProposalMessage(ctx, userId);
  return { messageId, toolUseId };
};

export const buildNote = (userId: string, source: EntrySource, overrides: Partial<NoteEntry> = {}): NoteEntry => ({
  id: randomUUID(),
  userId,
  version: 1,
  kind: 'note',
  originalWords: 'slept badly',
  start: { date: '2026-01-01', precision: 'day' },
  startTime: null,
  endDate: null,
  endTime: null,
  timeZone: TIME_ZONE,
  source,
  ...overrides,
});

export const buildSymptom = (
  note: NoteEntry,
  subject: Subject,
  overrides: Partial<SymptomEntry> = {},
): SymptomEntry => ({ ...note, kind: 'symptom', subjectId: subject.id, severity: severityOf(6), ...overrides });

export const seedEntry = async <E extends NoteEntry | SymptomEntry>(ctx: TestContext, entry: E): Promise<E> => {
  if (!(await ctx.repos.entries.insert(entry, CREATED_AT))) throw new Error(`The seed entry ${entry.id} exists`);
  return entry;
};

export const seedNote = async (ctx: TestContext, userId: string, overrides: Partial<NoteEntry> = {}) =>
  seedEntry(ctx, buildNote(userId, await seedEntrySource(ctx, userId), overrides));

// The answer is inserted first but is newer, so a test sees that the order comes from created_at.
export const seedConversationWithMessages = async (ctx: TestContext, userId: string) => {
  const conversation = await seedEmptyConversation(ctx, userId);
  const answer = {
    ...buildTextMessage(conversation.id, 'assistant', 'One note this week.', LATER),
    model: 'claude-sonnet-5-5',
    promptVersion: 'answer-v1',
  };
  const question = buildTextMessage(conversation.id, 'user', 'How was my week?', CREATED_AT);
  await ctx.repos.messages.insert(answer);
  await ctx.repos.messages.insert(question);
  return { conversation, question, answer };
};
