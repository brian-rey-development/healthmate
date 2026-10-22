import { describe, expect, it } from 'vitest';
import { PROPOSED_AT, proposalMessage } from '../testing/conversations.fixtures';
import { openProposal, PROPOSAL_LIFETIME_HOURS } from './proposal';

const MS_PER_HOUR = 3_600_000;
const hoursLater = (hours: number) => new Date(PROPOSED_AT.getTime() + hours * MS_PER_HOUR);
const NOT_FOUND = { ok: false, error: 'proposal_not_found' };

describe('openProposal', () => {
  it('finds the proposal in the last assistant message', () => {
    expect(openProposal(proposalMessage(), 'toolu_1', hoursLater(1))).toMatchObject({
      ok: true,
      value: { messageId: 'message-1', toolUse: { id: 'toolu_1' } },
    });
  });

  it('finds nothing in an empty conversation', () => {
    expect(openProposal(undefined, 'toolu_1', hoursLater(1))).toEqual(NOT_FOUND);
  });

  it('finds nothing for an unknown tool use id', () => {
    expect(openProposal(proposalMessage(), 'toolu_9', hoursLater(1))).toEqual(NOT_FOUND);
  });

  it('finds nothing in a message from the person', () => {
    expect(openProposal(proposalMessage({ role: 'user' }), 'toolu_1', hoursLater(1))).toEqual(NOT_FOUND);
  });

  it('finds nothing for a tool that does not propose', () => {
    const search = proposalMessage({
      content: [{ type: 'tool_use', id: 'toolu_1', name: 'search_entries', input: {} }],
    });
    expect(openProposal(search, 'toolu_1', hoursLater(1))).toEqual(NOT_FOUND);
  });

  it('expires the proposal after its lifetime', () => {
    expect(openProposal(proposalMessage(), 'toolu_1', hoursLater(PROPOSAL_LIFETIME_HOURS))).toMatchObject({ ok: true });
    expect(openProposal(proposalMessage(), 'toolu_1', hoursLater(PROPOSAL_LIFETIME_HOURS + 1))).toEqual({
      ok: false,
      error: 'proposal_expired',
    });
  });
});
