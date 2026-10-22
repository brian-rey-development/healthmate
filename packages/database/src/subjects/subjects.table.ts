import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { kind } from '../enums';
import { users } from '../users/users.table';

export const subjects = pgTable(
  'subjects',
  {
    id: uuid().primaryKey(),
    userId: uuid().references(() => users.id),
    kind: kind().notNull(),
    name: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    unique('subjects_id_kind_unique').on(t.id, t.kind),
    uniqueIndex('subjects_seed_name_unique')
      .on(t.kind, sql`lower(${t.name})`)
      .where(sql`${t.userId} is null`),
    uniqueIndex('subjects_private_name_unique')
      .on(t.userId, t.kind, sql`lower(${t.name})`)
      .where(sql`${t.userId} is not null`),
    index('subjects_name_trgm').using('gin', sql`${t.name} extensions.gin_trgm_ops`),
    check('subjects_kind_not_note', sql`${t.kind} <> 'note'`),
  ],
).enableRLS();

export type SubjectRow = typeof subjects.$inferSelect;
export type NewSubjectRow = typeof subjects.$inferInsert;
