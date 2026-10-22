import type { Subject, SubjectsRepository } from '@healthmate/core';
import { and, eq, ilike, isNull, or, sql, type SQL } from 'drizzle-orm';
import type { Executor } from '../executor';
import { first, requireLimit, wroteRow } from '../rows';
import { subjects, type SubjectRow } from './subjects.table';

const EXACT_RANK = 0;
const PREFIX_RANK = 1;
const OTHER_RANK = 2;

const toSubject = ({ id, userId, kind, name }: SubjectRow): Subject => {
  if (kind === 'note') throw new Error(`Subject ${id} has kind note`);
  return { id, userId, kind, name };
};

const visibleTo = (userId: string) => or(isNull(subjects.userId), eq(subjects.userId, userId));

const owned = (userId: string, id: string) => and(eq(subjects.id, id), visibleTo(userId));

const escapeLike = (query: string): string => query.replace(/[\\%_]/g, (char) => `\\${char}`);

const matchRank = (query: string): SQL<number> => sql<number>`case
  when lower(${subjects.name}) = lower(${query}) then ${EXACT_RANK}
  when ${ilike(subjects.name, `${escapeLike(query)}%`)} then ${PREFIX_RANK}
  else ${OTHER_RANK} end`;

// The fake in core compares names by code unit, so the database does the same instead of using the locale.
const byteOrder = (column: typeof subjects.name): SQL => sql`${column} collate "C"`;

const findById =
  (db: Executor): SubjectsRepository['findById'] =>
  async (userId, id) => {
    const row = first(await db.select().from(subjects).where(owned(userId, id)));
    return row && toSubject(row);
  };

// The trigram index serves both the % operator and ilike. Exact matches rank first, then prefixes, then the rest.
const search =
  (db: Executor): SubjectsRepository['search'] =>
  async ({ userId, kind, query, limit }) => {
    const matchesName = or(
      sql`${subjects.name} operator(extensions.%) ${query}`,
      ilike(subjects.name, `%${escapeLike(query)}%`),
    );
    const rows = await db
      .select()
      .from(subjects)
      .where(and(visibleTo(userId), eq(subjects.kind, kind), matchesName))
      .orderBy(matchRank(query), byteOrder(subjects.name), subjects.id)
      .limit(requireLimit(limit));
    return rows.map(toSubject);
  };

// Drizzle cannot name an expression index as a conflict target, so this insert is SQL. Each owner scope has its own partial index.
const conflictTarget = (userId: string | null): SQL =>
  userId === null
    ? sql`(kind, lower(name)) where user_id is null`
    : sql`(user_id, kind, lower(name)) where user_id is not null`;

const insert =
  (db: Executor): SubjectsRepository['insert'] =>
  async ({ id, userId, kind, name }, createdAt) =>
    wroteRow(
      await db.execute(sql`
        insert into ${subjects} (id, user_id, kind, name, created_at)
        values (${id}, ${userId}, ${kind}, ${name}, ${createdAt.toISOString()}::timestamptz)
        on conflict ${conflictTarget(userId)} do nothing
        returning id`),
    );

export const createSubjectsRepository = (db: Executor): SubjectsRepository => ({
  findById: findById(db),
  search: search(db),
  insert: insert(db),
});
