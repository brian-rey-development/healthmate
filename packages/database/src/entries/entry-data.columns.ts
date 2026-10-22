import { date, jsonb, text, time, uuid } from 'drizzle-orm/pg-core';
import { datePrecision, kind } from '../enums';

export type SymptomValue = { readonly severity: number };
export type NoteValue = Readonly<Record<string, never>>;
export type EntryValue = SymptomValue | NoteValue;

// The columns that entries and entry_history share. A function, so each table gets its own column builders.
// Dates are strings, because a JS Date moves a date-only value across time zones.
export const entryDataColumns = () => ({
  subjectId: uuid(),
  kind: kind().notNull(),
  value: jsonb().$type<EntryValue>().notNull(),
  originalWords: text().notNull(),
  startDate: date({ mode: 'string' }).notNull(),
  startPrecision: datePrecision().notNull(),
  startTime: time(),
  endDate: date({ mode: 'string' }),
  endTime: time(),
  timeZone: text().notNull(),
});
