import type { Subject, SubjectsRepository } from '@healthmate/core';
import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import type { Executor } from '../executor';
import { first, wroteRow } from '../rows';
import { subjects, type SubjectRow } from './subjects.table';

// Throws on a note row, which the subjects_kind_not_note check already forbids.
const toSubject = ({ id, userId, kind, name }: SubjectRow): Subject => {
  if (kind === 'note') throw new Error(`Subject ${id} has kind note`);
  return { id, userId, kind, name };
};

const visibleTo = (userId: string) => or(isNull(subjects.userId), eq(subjects.userId, userId));

const escapeLike = (query: string): string => query.replace(/[\\%_]/g, (char) => `\\${char}`);

const findById =
  (db: Executor): SubjectsRepository['findById'] =>
  async (userId, id) => {
    const row = first(await db.select().from(subjects).where(and(eq(subjects.id, id), visibleTo(userId))));
    return row && toSubject(row);
  };

// Seed rows and the person's own rows, closest name first. The trigram index serves both % and ilike.
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
      .orderBy(desc(sql`extensions.similarity(${subjects.name}, ${query})`), subjects.name)
      .limit(limit);
    return rows.map(toSubject);
  };

// False when one of the partial unique indexes on the lower-case name already holds it.
const insert =
  (db: Executor): SubjectsRepository['insert'] =>
  async (subject, createdAt) =>
    wroteRow(
      await db
        .insert(subjects)
        .values({ ...subject, createdAt })
        .onConflictDoNothing()
        .returning({ id: subjects.id }),
    );

export const createSubjectsRepository = (db: Executor): SubjectsRepository => ({
  findById: findById(db),
  search: search(db),
  insert: insert(db),
});
