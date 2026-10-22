import { err, ok, type Result } from '../../shared/domain/result';
import type { Message, ToolUseBlock } from './message';

export const PROPOSAL_TOOL_NAMES: ReadonlySet<string> = new Set(['propose_entry']);

const MS_PER_HOUR = 3_600_000;
export const PROPOSAL_LIFETIME_HOURS = 24;

export type OpenProposal = { readonly messageId: string; readonly toolUse: ToolUseBlock };

export type ProposalError = 'proposal_not_found' | 'proposal_expired';

const isProposal =
  (toolUseId: string) =>
  (block: Message['content'][number]): block is ToolUseBlock =>
    block.type === 'tool_use' && block.id === toolUseId && PROPOSAL_TOOL_NAMES.has(block.name);

// The model API answers every tool_use in the next turn, so only the last message can hold an open proposal.
export const openProposal = (
  lastMessage: Message | undefined,
  toolUseId: string,
  now: Date,
): Result<OpenProposal, ProposalError> => {
  const toolUse = lastMessage?.role === 'assistant' ? lastMessage.content.find(isProposal(toolUseId)) : undefined;
  if (!lastMessage || !toolUse) return err('proposal_not_found');
  const ageHours = (now.getTime() - lastMessage.createdAt.getTime()) / MS_PER_HOUR;
  if (ageHours > PROPOSAL_LIFETIME_HOURS) return err('proposal_expired');
  return ok({ messageId: lastMessage.id, toolUse });
};
