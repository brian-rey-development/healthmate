import type { Result } from '../../shared/domain/result';
import type { Clock } from '../../shared/ports/clock';
import type { IdGenerator } from '../../shared/ports/id-generator';
import { saveEntry, type RecordEntryError } from '../../entries/application/record-entry';
import type { Entry } from '../../entries/domain/entry';
import type { EntryDraft } from '../../entries/domain/missing-fields';
import type { EntriesRepository } from '../../entries/ports/entries-repository';
import { openProposal, type ProposalError } from '../domain/proposal';
import type { MessagesRepository } from '../ports/messages-repository';

export type ConfirmProposalDeps = {
  readonly messages: MessagesRepository;
  readonly entries: EntriesRepository;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly parseDraft: (input: unknown) => Result<EntryDraft, 'proposal_invalid'>;
};

export type ConfirmProposalInput = {
  readonly userId: string;
  readonly timeZone: string;
  readonly conversationId: string;
  readonly toolUseId: string;
};

export type ConfirmProposalError = ProposalError | 'proposal_invalid' | RecordEntryError;

export const confirmProposal = async (
  { messages, entries, ids, clock, parseDraft }: ConfirmProposalDeps,
  { conversationId, toolUseId, ...identity }: ConfirmProposalInput,
): Promise<Result<Entry, ConfirmProposalError>> => {
  const now = clock.now();
  const latest = await messages.findLatest(identity.userId, conversationId);
  const proposal = openProposal(latest, toolUseId, now);
  if (!proposal.ok) return proposal;
  const draft = parseDraft(proposal.value.toolUse.input);
  if (!draft.ok) return draft;
  const source = { messageId: proposal.value.messageId, toolUseId };
  return saveEntry({ entries, ids }, { ...identity, source, draft: draft.value }, now);
};
