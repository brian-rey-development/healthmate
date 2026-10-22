import type { Citation } from '../domain/citation';

export interface CitationsRepository {
  // The caller must verify that the message and each entry version belong to the user.
  insertMany(citations: readonly Citation[]): Promise<void>;
  // Ordered by entry id, then version. The limit is at least 1.
  listForMessage(userId: string, messageId: string, limit: number): Promise<Citation[]>;
}
