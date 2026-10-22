import type { Message } from '../domain/message';

export const PROPOSED_AT = new Date('2026-03-15T10:00:00Z');

export const PROPOSED_INPUT = { kind: 'symptom', subject: 'headache' };

export const proposalMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'message-1',
  conversationId: 'conversation-1',
  role: 'assistant',
  content: [
    { type: 'text', text: 'Shall I save this headache?' },
    { type: 'tool_use', id: 'toolu_1', name: 'propose_entry', input: PROPOSED_INPUT },
  ],
  transcript: null,
  model: 'claude-sonnet-5-5',
  promptVersion: 'v1',
  createdAt: PROPOSED_AT,
  ...overrides,
});
