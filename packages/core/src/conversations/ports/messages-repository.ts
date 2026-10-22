import type { Message } from '../domain/message';

export interface MessagesRepository {
  // The caller loads the conversation for its owner first.
  insert(message: Message): Promise<void>;
  findById(userId: string, id: string): Promise<Message | undefined>;
  // The newest message, ordered by (createdAt, id). Undefined for a conversation of another user.
  findLatest(userId: string, conversationId: string): Promise<Message | undefined>;
  // The newest `limit` messages, oldest first, ordered by (createdAt, id). The limit is at least 1.
  listLatest(userId: string, conversationId: string, limit: number): Promise<Message[]>;
}
