import { compareText } from '../../shared/domain/compare-text';
import { requireLimit } from '../../shared/domain/require-limit';
import type { Subject } from '../domain/subject';
import type { SubjectSearch, SubjectsRepository } from '../ports/subjects-repository';

export type InMemorySubjectsRepository = SubjectsRepository & { createdAtOf(id: string): Date | undefined };

type Stored = { readonly subject: Subject; readonly createdAt: Date };

const SEED_CREATED_AT = new Date(0);

// Postgres folds case with lower(). toLowerCase() can differ for a few rare scripts.
const fold = (text: string): string => text.normalize('NFC').toLowerCase();

const sameScope = (a: Subject, b: Subject): boolean =>
  a.userId === b.userId && a.kind === b.kind && fold(a.name) === fold(b.name);

const visibleTo = (userId: string) => (subject: Subject) => subject.userId === null || subject.userId === userId;

const matchRank = (name: string, query: string): number => {
  if (name === query) return 0;
  return name.startsWith(query) ? 1 : 2;
};

const bestMatchFirst = (needle: string) => (a: Subject, b: Subject) =>
  matchRank(fold(a.name), needle) - matchRank(fold(b.name), needle) ||
  compareText(a.name, b.name) ||
  compareText(a.id, b.id);

// This fake has no close match. It finds only literal substrings.
const searchRows = (rows: readonly Stored[], { userId, kind, query, limit }: SubjectSearch): Subject[] => {
  const needle = fold(query);
  return rows
    .map(({ subject }) => subject)
    .filter(visibleTo(userId))
    .filter((subject) => subject.kind === kind && fold(subject.name).includes(needle))
    .toSorted(bestMatchFirst(needle))
    .slice(0, requireLimit(limit))
    .map((subject) => ({ ...subject }));
};

const insertRow = (rows: Stored[], subject: Subject, createdAt: Date): boolean => {
  if (rows.some((row) => row.subject.id === subject.id)) throw new Error(`subject ${subject.id} already exists`);
  if (rows.some((row) => sameScope(row.subject, subject))) return false;
  rows.push({ subject: { ...subject }, createdAt: new Date(createdAt) });
  return true;
};

export const inMemorySubjectsRepository = (seed: readonly Subject[] = []): InMemorySubjectsRepository => {
  const rows: Stored[] = seed.map((subject) => ({ subject: { ...subject }, createdAt: SEED_CREATED_AT }));
  const find = (id: string) => rows.find(({ subject }) => subject.id === id);
  return {
    findById: async (userId, id) => {
      const subject = find(id)?.subject;
      return subject && visibleTo(userId)(subject) ? { ...subject } : undefined;
    },
    search: async (search) => searchRows(rows, search),
    insert: async (subject, createdAt) => insertRow(rows, subject, createdAt),
    createdAtOf: (id) => {
      const stored = find(id);
      return stored && new Date(stored.createdAt);
    },
  };
};
