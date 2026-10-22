import { compareText } from '../../shared/domain/compare-text';
import { requireLimit } from '../../shared/domain/require-limit';
import type { Message } from '../domain/message';
import type { MessagesRepository } from '../ports/messages-repository';

const DEFAULT_OWNER = 'user-1';

const copyMessage = (message: Message): Message => ({
  ...message,
  content: message.content.map((block) => ({ ...block })),
  createdAt: new Date(message.createdAt),
});

const chronological = (a: Message, b: Message): number =>
  a.createdAt.getTime() - b.createdAt.getTime() || compareText(a.id, b.id);

const inOrder = (messages: readonly Message[]): Message[] => messages.toSorted(chronological).map(copyMessage);

// A conversation has 1 owner. Every read of another user finds nothing, like the owner filter in Postgres.
export const inMemoryMessagesRepository = (
  seed: readonly Message[] = [],
  ownerOf: (conversationId: string) => string | undefined = () => DEFAULT_OWNER,
): MessagesRepository => {
  const rows: Message[] = seed.map(copyMessage);
  const ownedBy = (userId: string) => rows.filter((m) => ownerOf(m.conversationId) === userId);
  const inConversation = (userId: string, conversationId: string) =>
    inOrder(ownedBy(userId).filter((m) => m.conversationId === conversationId));
  return {
    insert: async (message) => {
      rows.push(copyMessage(message));
    },
    findById: async (userId, id) => ownedBy(userId).filter((m) => m.id === id).map(copyMessage).at(0),
    findLatest: async (userId, conversationId) => inConversation(userId, conversationId).at(-1),
    listLatest: async (userId, conversationId, limit) =>
      inConversation(userId, conversationId).slice(-requireLimit(limit)),
  };
};
