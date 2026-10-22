import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import type { SubjectKind } from '../enums';
import type { Executor } from '../executor';
import { first, single } from '../rows';
import { subjects, type NewSubjectRow, type SubjectRow } from './subjects.table';

export type SubjectSearch = {
  readonly userId: string;
  readonly kind: SubjectKind;
  readonly query: string;
  readonly limit: number;
};

const visibleTo = (userId: string) => or(isNull(subjects.userId), eq(subjects.userId, userId));

const escapeLike = (query: string): string => query.replace(/[\\%_]/g, (char) => `\\${char}`);

const findById =
  (db: Executor) =>
  async (userId: string, id: string): Promise<SubjectRow | undefined> =>
    first(
      await db
        .select()
        .from(subjects)
        .where(and(eq(subjects.id, id), visibleTo(userId))),
    );

// Seed rows and the person's own rows, closest name first. The trigram index serves both % and ilike.
const search =
  (db: Executor) =>
  async ({ userId, kind, query, limit }: SubjectSearch): Promise<SubjectRow[]> =>
    db
      .select()
      .from(subjects)
      .where(
        and(
          visibleTo(userId),
          eq(subjects.kind, kind),
          or(sql`${subjects.name} operator(extensions.%) ${query}`, ilike(subjects.name, `%${escapeLike(query)}%`)),
        ),
      )
      .orderBy(desc(sql`extensions.similarity(${subjects.name}, ${query})`), subjects.name)
      .limit(limit);

const insert =
  (db: Executor) =>
  async (row: NewSubjectRow): Promise<SubjectRow> =>
    single(await db.insert(subjects).values(row).returning());

export const createSubjectsRepository = (db: Executor) => ({
  findById: findById(db),
  search: search(db),
  insert: insert(db),
});
