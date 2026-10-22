import { and, desc, eq, gte, lte } from 'drizzle-orm';
import type { Executor } from '../executor';
import { timelineEntries, type TimelineEntryRow } from './timeline-entries.view';

export type TimelineRange = {
  readonly userId: string;
  readonly from: string;
  readonly to: string;
};

// Filters and sorts on start_date only. Open and overlapping entries, and the order inside one day, wait for ADR-004.
const listStartingBetween =
  (db: Executor) =>
  async ({ userId, from, to }: TimelineRange): Promise<TimelineEntryRow[]> =>
    db
      .select()
      .from(timelineEntries)
      .where(
        and(
          eq(timelineEntries.userId, userId),
          gte(timelineEntries.startDate, from),
          lte(timelineEntries.startDate, to),
        ),
      )
      .orderBy(desc(timelineEntries.startDate), desc(timelineEntries.createdAt), desc(timelineEntries.id));

export const createTimelineEntriesRepository = (db: Executor) => ({
  listStartingBetween: listStartingBetween(db),
});
