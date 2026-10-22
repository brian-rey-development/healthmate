import type {
  CitationsRepository,
  ConversationsRepository,
  EntriesRepository,
  EntryHistoryRepository,
  MessagesRepository,
  SubjectsRepository,
  TimelineRepository,
  UsersRepository,
} from '@healthmate/core';
import { createCitationsRepository } from './citations/citations.repository';
import type { Database } from './client';
import { createConversationsRepository } from './conversations/conversations.repository';
import { createMessagesRepository } from './conversations/messages.repository';
import { createEntriesRepository } from './entries/entries.repository';
import { createEntryHistoryRepository } from './entries/entry-history.repository';
import type { Executor } from './executor';
import { createSubjectsRepository } from './subjects/subjects.repository';
import { createUsersRepository } from './users/users.repository';
import { createTimelineRepository } from './views/timeline-entries.repository';

// The keys match the dependency names of the core use cases, so the api passes repositories in unchanged.
export type Repositories = {
  readonly users: UsersRepository;
  readonly subjects: SubjectsRepository;
  readonly entries: EntriesRepository;
  readonly entryHistory: EntryHistoryRepository;
  readonly timeline: TimelineRepository;
  readonly conversations: ConversationsRepository;
  readonly messages: MessagesRepository;
  readonly citations: CitationsRepository;
};

export const createRepositories = (db: Executor): Repositories => ({
  users: createUsersRepository(db),
  subjects: createSubjectsRepository(db),
  entries: createEntriesRepository(db),
  entryHistory: createEntryHistoryRepository(db),
  timeline: createTimelineRepository(db),
  conversations: createConversationsRepository(db),
  messages: createMessagesRepository(db),
  citations: createCitationsRepository(db),
});

export const inTransaction = <T>(db: Database, work: (repos: Repositories) => Promise<T>): Promise<T> =>
  db.transaction((tx) => work(createRepositories(tx)));
