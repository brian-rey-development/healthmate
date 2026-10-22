import type { Result } from '../../shared/domain/result';
import type { Clock } from '../../shared/ports/clock';
import { recordEntry, type RecordEntryError, type RecordEntryInput } from '../../entries/application/record-entry';
import type { Entry } from '../../entries/domain/entry';
import type { EntriesRepository } from '../../entries/ports/entries-repository';
import { openProposal, type ProposalError } from '../domain/proposal';
import type { MessagesRepository } from '../ports/messages-repository';

export type ConfirmProposalDeps = {
  readonly messages: MessagesRepository;
  readonly entries: EntriesRepository;
  readonly clock: Clock;
};

// The agent parses the tool_use input into the draft, because core never parses JSON.
export type ConfirmProposalInput = Omit<RecordEntryInput, 'source'> & {
  readonly conversationId: string;
  readonly toolUseId: string;
};

export type ConfirmProposalError = ProposalError | RecordEntryError;

export const confirmProposal = async (
  { messages, entries, clock }: ConfirmProposalDeps,
  { conversationId, toolUseId, ...entry }: ConfirmProposalInput,
): Promise<Result<Entry, ConfirmProposalError>> => {
  const lastMessage = await messages.findLast(entry.userId, conversationId);
  const proposal = openProposal(lastMessage, toolUseId, clock.now());
  if (!proposal.ok) return proposal;
  const source = { messageId: proposal.value.messageId, toolUseId };
  return recordEntry({ entries, clock }, { ...entry, source });
};
