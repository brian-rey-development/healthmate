import { describe, expect, it } from 'vitest';
import { correctEntry } from '../../entries/application/correct-entry';
import { symptomDraft } from '../../entries/testing/entries.fixtures';
import { inMemoryEntriesRepository } from '../../entries/testing/in-memory-entries-repository';
import { err, ok } from '../../shared/domain/result';
import { fixedClock } from '../../shared/testing/fixed-clock';
import { sequentialIds } from '../../shared/testing/sequential-ids';
import type { Message } from '../domain/message';
import { PROPOSED_AT, PROPOSED_INPUT, proposalMessage } from '../testing/conversations.fixtures';
import { inMemoryMessagesRepository } from '../testing/in-memory-messages-repository';
import { confirmProposal, type ConfirmProposalDeps, type ConfirmProposalInput } from './confirm-proposal';

const MS_PER_HOUR = 3_600_000;
const A_MINUTE_LATER = new Date(PROPOSED_AT.getTime() + 60_000);
const TWO_DAYS_LATER = new Date(PROPOSED_AT.getTime() + 48 * MS_PER_HOUR);

const input: ConfirmProposalInput = { conversationId: 'conversation-1', toolUseId: 'toolu_1', userId: 'user-1', timeZone: 'Europe/Madrid' };

const parseDraft: ConfirmProposalDeps['parseDraft'] = (raw) =>
  raw === PROPOSED_INPUT ? ok(symptomDraft()) : err('proposal_invalid');

const setup = (now: Date, history: readonly Message[] = [proposalMessage()]) => {
  const messages = inMemoryMessagesRepository(history, () => 'user-1');
  const deps = { messages, entries: inMemoryEntriesRepository(), ids: sequentialIds('entry'), parseDraft };
  const confirmAt = (at: Date, who: ConfirmProposalInput = input) =>
    confirmProposal({ ...deps, clock: fixedClock(at) }, who);
  return { ...deps, clock: fixedClock(now), confirm: () => confirmAt(now), confirmAt };
};

describe('confirmProposal', () => {
  it('records the entry with the proposal as its source', async () => {
    const { confirm } = setup(A_MINUTE_LATER);

    expect(await confirm()).toMatchObject({
      ok: true,
      value: { id: 'entry-1', source: { messageId: 'message-1', toolUseId: 'toolu_1' } },
    });
  });

  it('records the draft that the parser reads from the stored tool use input', async () => {
    const { confirm, entries } = setup(A_MINUTE_LATER);

    await confirm();

    expect(await entries.findById('user-1', 'entry-1')).toMatchObject({ subjectId: 'headache', severity: 6 });
  });

  it('stores the time of the clock as the creation time', async () => {
    const { confirm, entries } = setup(A_MINUTE_LATER);

    await confirm();

    expect(entries.timestampsOf('entry-1')).toEqual({ createdAt: A_MINUTE_LATER, updatedAt: A_MINUTE_LATER });
  });

  it('rejects a stored input that the parser refuses', async () => {
    const stored = proposalMessage({
      content: [{ type: 'tool_use', id: 'toolu_1', name: 'propose_entry', input: { kind: 'unknown' } }],
    });
    const { confirm, entries } = setup(A_MINUTE_LATER, [stored]);

    expect(await confirm()).toEqual({ ok: false, error: 'proposal_invalid' });
    expect(await entries.findById('user-1', 'entry-1')).toBeUndefined();
  });

  it('records a proposal only once', async () => {
    const { confirm } = setup(A_MINUTE_LATER);

    await confirm();

    expect(await confirm()).toEqual({ ok: false, error: 'entry_already_recorded' });
  });

  it('records a proposal only once, even after the entry was corrected', async () => {
    const { confirm, entries, clock } = setup(A_MINUTE_LATER);
    await confirm();
    const source = { messageId: 'message-9', toolUseId: 'toolu_9' };
    const correction = {
      userId: 'user-1',
      entryId: 'entry-1',
      expectedVersion: 1,
      source,
      changes: { originalWords: 'headache, worse' },
    };
    await correctEntry({ entries, clock }, correction);

    expect(await confirm()).toEqual({ ok: false, error: 'entry_already_recorded' });
    expect(await entries.findById('user-1', 'entry-1')).toMatchObject({ version: 2 });
  });

  it('rejects a proposal that a later message has answered', async () => {
    const answer = proposalMessage({
      id: 'message-2',
      role: 'user',
      content: [{ type: 'text', text: 'no' }],
      createdAt: A_MINUTE_LATER,
    });
    const { confirm, entries } = setup(A_MINUTE_LATER, [proposalMessage(), answer]);

    expect(await confirm()).toEqual({ ok: false, error: 'proposal_not_found' });
    expect(await entries.findById('user-1', 'entry-1')).toBeUndefined();
  });

  it('rejects an expired proposal', async () => {
    const { confirm } = setup(TWO_DAYS_LATER);

    expect(await confirm()).toEqual({ ok: false, error: 'proposal_expired' });
  });

  it('reports an expired proposal, not a recorded one, when it is confirmed again after expiry', async () => {
    const { confirmAt } = setup(A_MINUTE_LATER);
    await confirmAt(A_MINUTE_LATER);

    expect(await confirmAt(TWO_DAYS_LATER)).toEqual({ ok: false, error: 'proposal_expired' });
  });

  it('finds no proposal in the conversation of another user', async () => {
    const { confirmAt, entries } = setup(A_MINUTE_LATER);

    expect(await confirmAt(A_MINUTE_LATER, { ...input, userId: 'user-2' })).toEqual({
      ok: false,
      error: 'proposal_not_found',
    });
    expect(await entries.findById('user-2', 'entry-1')).toBeUndefined();
  });
});
