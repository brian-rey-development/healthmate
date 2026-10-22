import type { NoteEntry, SymptomEntry } from '../domain/entry';

export type TimelineItem = (NoteEntry & { readonly subjectName: null }) | (SymptomEntry & { readonly subjectName: string });

export type TimelineRange = {
  readonly userId: string;
  readonly from: string;
  readonly to: string;
  readonly limit: number;
};

export interface TimelineRepository {
  // The from and to dates are inclusive and compare with the start date. An entry of a month or a year starts on its first day.
  // Newest start date first, then id. ADR-004 may refine the order inside one day. The limit is at least 1.
  listStartingBetween(range: TimelineRange): Promise<TimelineItem[]>;
}
