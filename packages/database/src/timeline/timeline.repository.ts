import type { TimelineItem, TimelineRepository } from '@healthmate/core';
import { and, asc, desc, eq, getTableColumns, gte, lte } from 'drizzle-orm';
import { entries } from '../entries/entries.table';
import { toEntry } from '../entries/entry.mapper';
import type { Executor } from '../executor';
import { requireLimit } from '../rows';
import { subjects } from '../subjects/subjects.table';

type TimelineRow = typeof entries.$inferSelect & { readonly subjectName: string | null };

const toTimelineItem = ({ subjectName, ...row }: TimelineRow): TimelineItem => {
  const entry = toEntry(row);
  if (entry.kind === 'note') return { ...entry, subjectName: null };
  if (subjectName === null) throw new Error(`Symptom entry ${entry.id} has no subject name`);
  return { ...entry, subjectName };
};

// Filters and sorts on start_date only. Open and overlapping entries, and the order inside one day, wait for ADR-004.
const listStartingBetween =
  (db: Executor): TimelineRepository['listStartingBetween'] =>
  async ({ userId, from, to, limit }) => {
    const inRange = and(eq(entries.userId, userId), gte(entries.startDate, from), lte(entries.startDate, to));
    const rows = await db
      .select({ ...getTableColumns(entries), subjectName: subjects.name })
      .from(entries)
      .leftJoin(subjects, eq(entries.subjectId, subjects.id))
      .where(inRange)
      .orderBy(desc(entries.startDate), asc(entries.id))
      .limit(requireLimit(limit));
    return rows.map(toTimelineItem);
  };

export const createTimelineRepository = (db: Executor): TimelineRepository => ({
  listStartingBetween: listStartingBetween(db),
});
