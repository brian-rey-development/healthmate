import type { Message } from '../domain/message';
import type { MessagesRepository } from '../ports/messages-repository';

// Holds the messages of one person, so the user filter is not modelled here.
export const inMemoryMessagesRepository = (seed: readonly Message[] = []): MessagesRepository => {
  const rows: Message[] = [...seed];
  const inConversation = (conversationId: string) =>
    rows.filter((message) => message.conversationId === conversationId);
  return {
    insert: async (message) => {
      rows.push(message);
    },
    findById: async (_userId, id) => rows.find((message) => message.id === id),
    findLast: async (_userId, conversationId) => inConversation(conversationId).at(-1),
    listForConversation: async (_userId, conversationId) => inConversation(conversationId),
  };
};
