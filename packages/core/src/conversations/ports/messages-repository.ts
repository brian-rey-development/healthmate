import type { Message } from '../domain/message';

export interface MessagesRepository {
  // The caller loads the conversation for its owner first.
  insert(message: Message): Promise<void>;
  findById(userId: string, id: string): Promise<Message | undefined>;
  findLast(userId: string, conversationId: string): Promise<Message | undefined>;
  listForConversation(userId: string, conversationId: string): Promise<Message[]>;
}
