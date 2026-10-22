import { describe, expect, it } from 'vitest';
import { PROPOSED_AT, proposalMessage } from './conversations.fixtures';
import { inMemoryMessagesRepository } from './in-memory-messages-repository';

const at = (minutes: number) => new Date(PROPOSED_AT.getTime() + minutes * 60_000);
const message = (id: string, minutes: number) => proposalMessage({ id, createdAt: at(minutes) });

const OUT_OF_ORDER = [message('m-3', 3), message('m-1', 1), message('m-2', 2)];

describe('inMemoryMessagesRepository', () => {
  it('finds the newest message by creation time, not by insertion order', async () => {
    const messages = inMemoryMessagesRepository(OUT_OF_ORDER);

    expect(await messages.findLatest('user-1', 'conversation-1')).toMatchObject({ id: 'm-3' });
  });

  it('breaks a tie of creation time by id', async () => {
    const messages = inMemoryMessagesRepository([message('m-b', 1), message('m-a', 1)]);

    expect(await messages.findLatest('user-1', 'conversation-1')).toMatchObject({ id: 'm-b' });
  });

  it('lists the newest messages oldest first, up to the limit', async () => {
    const messages = inMemoryMessagesRepository(OUT_OF_ORDER);

    const listed = await messages.listLatest('user-1', 'conversation-1', 2);

    expect(listed.map((m) => m.id)).toEqual(['m-2', 'm-3']);
  });

  it('lists nothing for another user', async () => {
    const messages = inMemoryMessagesRepository(OUT_OF_ORDER);

    expect(await messages.listLatest('user-2', 'conversation-1', 10)).toEqual([]);
  });

  it('finds no message by id for another user', async () => {
    const messages = inMemoryMessagesRepository(OUT_OF_ORDER);

    expect(await messages.findById('user-2', 'm-1')).toBeUndefined();
  });

  it('does not let a test change a stored message', async () => {
    const messages = inMemoryMessagesRepository([message('m-1', 1)]);
    const first = await messages.findById('user-1', 'm-1');
    Object.assign(first ?? {}, { transcript: 'changed' });

    expect(await messages.findById('user-1', 'm-1')).toMatchObject({ transcript: null });
  });
});
