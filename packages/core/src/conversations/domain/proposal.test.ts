import { describe, expect, it } from 'vitest';
import { PROPOSED_AT, proposalMessage } from '../testing/conversations.fixtures';
import { openProposal, PROPOSAL_LIFETIME_MS } from './proposal';

const MS_PER_HOUR = 3_600_000;
const HOUR_AFTER = new Date(PROPOSED_AT.getTime() + MS_PER_HOUR);
const at = (offsetMs: number) => new Date(PROPOSED_AT.getTime() + offsetMs);
const NOT_FOUND = { ok: false, error: 'proposal_not_found' };

describe('openProposal', () => {
  it('finds the proposal in the last assistant message', () => {
    expect(openProposal(proposalMessage(), 'toolu_1', HOUR_AFTER)).toMatchObject({
      ok: true,
      value: { messageId: 'message-1', toolUse: { id: 'toolu_1' } },
    });
  });

  it('finds nothing in an empty conversation', () => {
    expect(openProposal(undefined, 'toolu_1', HOUR_AFTER)).toEqual(NOT_FOUND);
  });

  it('finds nothing for an unknown tool use id', () => {
    expect(openProposal(proposalMessage(), 'toolu_9', HOUR_AFTER)).toEqual(NOT_FOUND);
  });

  it('finds nothing in a message from the person', () => {
    expect(openProposal(proposalMessage({ role: 'user' }), 'toolu_1', HOUR_AFTER)).toEqual(NOT_FOUND);
  });

  it('finds nothing for a tool that does not propose', () => {
    const search = proposalMessage({
      content: [{ type: 'tool_use', id: 'toolu_1', name: 'search_entries', input: {} }],
    });
    expect(openProposal(search, 'toolu_1', HOUR_AFTER)).toEqual(NOT_FOUND);
  });

  it('keeps the proposal open at exactly 24 hours', () => {
    expect(openProposal(proposalMessage(), 'toolu_1', at(PROPOSAL_LIFETIME_MS))).toMatchObject({ ok: true });
  });

  it('expires the proposal 1 ms after 24 hours', () => {
    expect(openProposal(proposalMessage(), 'toolu_1', at(PROPOSAL_LIFETIME_MS + 1))).toEqual({
      ok: false,
      error: 'proposal_expired',
    });
  });

  // The api instances have small clock skew, so a message can look like it comes from the future.
  it('accepts a proposal that was created slightly in the future', () => {
    expect(openProposal(proposalMessage(), 'toolu_1', at(-5_000))).toMatchObject({ ok: true });
  });
});
