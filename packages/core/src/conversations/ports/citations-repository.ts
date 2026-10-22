import type { Citation } from '../domain/citation';

export interface CitationsRepository {
  insertMany(citations: readonly Citation[]): Promise<void>;
  listForMessage(userId: string, messageId: string): Promise<Citation[]>;
}
