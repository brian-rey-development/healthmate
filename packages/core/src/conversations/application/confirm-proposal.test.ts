import { describe, expect, it } from 'vitest';
import type { Severity } from '../../entries/domain/severity';
import { inMemoryEntriesRepository } from '../../entries/testing/in-memory-entries-repository';
import { fixedClock } from '../../shared/testing/fixed-clock';
import type { Message } from '../domain/message';
import { PROPOSED_AT, proposalMessage } from '../testing/conversations.fixtures';
import { inMemoryMessagesRepository } from '../testing/in-memory-messages-repository';
import { confirmProposal, type ConfirmProposalInput } from './confirm-proposal';

const A_MINUTE_LATER = new Date(PROPOSED_AT.getTime() + 60_000);
const TWO_DAYS_LATER = new Date(PROPOSED_AT.getTime() + 48 * 3_600_000);

const input: ConfirmProposalInput = {
  conversationId: 'conversation-1',
  toolUseId: 'toolu_1',
  id: 'entry-1',
  userId: 'user-1',
  timeZone: 'Europe/Madrid',
  draft: {
    kind: 'symptom',
    originalWords: 'headache, 6 out of 10',
    subjectId: 'headache',
    severity: 6 as Severity,
    start: { date: '2026-03-15', precision: 'day' },
  },
};

const setup = (now: Date, history: readonly Message[] = [proposalMessage()]) => {
  const deps = { messages: inMemoryMessagesRepository(history), entries: inMemoryEntriesRepository() };
  return { ...deps, confirm: () => confirmProposal({ ...deps, clock: fixedClock(now) }, input) };
};

describe('confirmProposal', () => {
  it('records the entry with the proposal as its source', async () => {
    const { confirm } = setup(A_MINUTE_LATER);

    expect(await confirm()).toMatchObject({
      ok: true,
      value: { id: 'entry-1', source: { messageId: 'message-1', toolUseId: 'toolu_1' } },
    });
  });

  it('records a proposal only once', async () => {
    const { confirm } = setup(A_MINUTE_LATER);

    await confirm();

    expect(await confirm()).toEqual({ ok: false, error: 'already_recorded' });
  });

  it('rejects a proposal that a later message has answered', async () => {
    const answer = proposalMessage({ id: 'message-2', role: 'user', content: [{ type: 'text', text: 'no' }] });
    const { confirm, entries } = setup(A_MINUTE_LATER, [proposalMessage(), answer]);

    expect(await confirm()).toEqual({ ok: false, error: 'proposal_not_found' });
    expect(await entries.findById('user-1', 'entry-1')).toBeUndefined();
  });

  it('rejects an expired proposal', async () => {
    const { confirm } = setup(TWO_DAYS_LATER);

    expect(await confirm()).toEqual({ ok: false, error: 'proposal_expired' });
  });
});
