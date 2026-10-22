import type { Entry } from '../domain/entry';

export type TimelineItem = Entry & { readonly subjectName: string | null };

export type TimelineRange = { readonly userId: string; readonly from: string; readonly to: string };

export interface TimelineRepository {
  // Newest start date first. The order inside one day waits for ADR-004.
  listStartingBetween(range: TimelineRange): Promise<TimelineItem[]>;
}
