import type { Channel, Conversation } from '../domain/conversation';

export interface ConversationsRepository {
  findById(userId: string, id: string): Promise<Conversation | undefined>;
  findLatest(userId: string, channel: Channel): Promise<Conversation | undefined>;
  insert(conversation: Conversation, createdAt: Date): Promise<void>;
}
