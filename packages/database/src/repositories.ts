import { createCitationsRepository } from './citations/citations.repository';
import type { Database } from './client';
import { createConversationsRepository } from './conversations/conversations.repository';
import { createMessagesRepository } from './conversations/messages.repository';
import { createEntriesRepository } from './entries/entries.repository';
import { createEntryHistoryRepository } from './entries/entry-history.repository';
import type { Executor } from './executor';
import { createSubjectsRepository } from './subjects/subjects.repository';
import { createToolCallsRepository } from './tool-calls/tool-calls.repository';
import { createUsersRepository } from './users/users.repository';
import { createTimelineEntriesRepository } from './views/timeline-entries.repository';

export const createRepositories = (db: Executor) => ({
  users: createUsersRepository(db),
  subjects: createSubjectsRepository(db),
  entries: createEntriesRepository(db),
  entryHistory: createEntryHistoryRepository(db),
  conversations: createConversationsRepository(db),
  messages: createMessagesRepository(db),
  toolCalls: createToolCallsRepository(db),
  citations: createCitationsRepository(db),
  timelineEntries: createTimelineEntriesRepository(db),
});

export type Repositories = ReturnType<typeof createRepositories>;

export const inTransaction = <T>(db: Database, work: (repos: Repositories) => Promise<T>): Promise<T> =>
  db.transaction((tx) => work(createRepositories(tx)));
