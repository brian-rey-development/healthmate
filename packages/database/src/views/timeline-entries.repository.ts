import type { TimelineRepository } from '@healthmate/core';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { toEntry } from '../entries/entry.mapper';
import type { Executor } from '../executor';
import { timelineEntries } from './timeline-entries.view';

// Filters and sorts on start_date only. Open and overlapping entries, and the order inside one day, wait for ADR-004.
const listStartingBetween =
  (db: Executor): TimelineRepository['listStartingBetween'] =>
  async ({ userId, from, to }) => {
    const rows = await db
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
    return rows.map(({ subjectName, ...row }) => ({ ...toEntry(row), subjectName }));
  };

export const createTimelineRepository = (db: Executor): TimelineRepository => ({
  listStartingBetween: listStartingBetween(db),
});
