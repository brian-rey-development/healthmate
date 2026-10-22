export { err, ok, type Err, type Ok, type Result } from './shared/domain/result';
export type { Clock } from './shared/ports/clock';
export type { IdGenerator } from './shared/ports/id-generator';

export { createDisplayName, MAX_DISPLAY_NAME_LENGTH, type User } from './users/domain/user';
export type { UsersRepository } from './users/ports/users-repository';
export { createUser, type CreateUserDeps, type CreateUserError, type CreateUserInput } from './users/application/create-user';

export { createSubjectName, MAX_SUBJECT_NAME_LENGTH, type Subject, type SubjectKind } from './subjects/domain/subject';
export type { SubjectSearch, SubjectsRepository } from './subjects/ports/subjects-repository';
export {
  addSubject,
  type AddSubjectDeps,
  type AddSubjectError,
  type AddSubjectInput,
} from './subjects/application/add-subject';

export { buildEntry, type BuildEntryError, type EntryIdentity } from './entries/domain/build-entry';
export { applyCorrection, type Correction, type CorrectionError, type EntryChanges } from './entries/domain/correction';
export type {
  Entry,
  EntrySource,
  EntryTimes,
  EntryVersion,
  NoteEntry,
  SymptomEntry,
} from './entries/domain/entry';
export { KINDS, type Kind } from './entries/domain/entry';
export {
  createEntryDate,
  DATE_PRECISIONS,
  type DatePrecision, type EntryDate, type EntryDateError,
} from './entries/domain/entry-date';
export { checkEntryTimes, type EntryTimesError } from './entries/domain/entry-times';
export { missingFields, type EntryDraft, type RequiredField } from './entries/domain/missing-fields';
export { createSeverity, MAX_SEVERITY, MIN_SEVERITY, type Severity } from './entries/domain/severity';
export type { EntriesRepository, SavedCorrection } from './entries/ports/entries-repository';
export type { EntryHistoryRepository, EntryVersionKey } from './entries/ports/entry-history-repository';
export type { TimelineItem, TimelineRange, TimelineRepository } from './entries/ports/timeline-repository';
export {
  correctEntry,
  type CorrectEntryDeps,
  type CorrectEntryError,
  type CorrectEntryInput,
} from './entries/application/correct-entry';
export { listTimeline, type ListTimelineDeps } from './entries/application/list-timeline';
export {
  recordEntry,
  type RecordEntryDeps,
  type RecordEntryError,
  type RecordEntryInput,
} from './entries/application/record-entry';

export type { Citation } from './conversations/domain/citation';
export { CHANNELS, type Channel, type Conversation } from './conversations/domain/conversation';
export {
  MESSAGE_ROLES,
  type ContentBlock,
  type Message,
  type MessageRole,
  type ToolUseBlock,
} from './conversations/domain/message';
export {
  openProposal,
  PROPOSAL_LIFETIME_HOURS,
  PROPOSAL_TOOL_NAMES,
  type OpenProposal,
  type ProposalError,
} from './conversations/domain/proposal';
export type { CitationsRepository } from './conversations/ports/citations-repository';
export type { ConversationsRepository } from './conversations/ports/conversations-repository';
export type { MessagesRepository } from './conversations/ports/messages-repository';
export {
  confirmProposal,
  type ConfirmProposalDeps,
  type ConfirmProposalError,
  type ConfirmProposalInput,
} from './conversations/application/confirm-proposal';
