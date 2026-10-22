import { eq, getTableColumns, sql } from 'drizzle-orm';
import { pgView } from 'drizzle-orm/pg-core';
import { entries } from '../entries/entries.table';
import { subjects } from '../subjects/subjects.table';

// security_invoker makes the view apply the RLS of its tables. Without it, a view reads as its owner.
export const timelineEntries = pgView('timeline_entries')
  .with({ securityInvoker: true })
  .as((qb) =>
    qb
      .select({ ...getTableColumns(entries), subjectName: sql<string | null>`${subjects.name}`.as('subject_name') })
      .from(entries)
      .leftJoin(subjects, eq(entries.subjectId, subjects.id)),
  );

export type TimelineEntryRow = typeof timelineEntries.$inferSelect;
