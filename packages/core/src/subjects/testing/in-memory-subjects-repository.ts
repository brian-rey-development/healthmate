import type { Subject } from '../domain/subject';
import type { SubjectsRepository } from '../ports/subjects-repository';

const sameScope = (a: Subject, b: Subject): boolean =>
  a.userId === b.userId && a.kind === b.kind && a.name.toLowerCase() === b.name.toLowerCase();

const visibleTo = (userId: string) => (subject: Subject) => subject.userId === null || subject.userId === userId;

export const inMemorySubjectsRepository = (seed: readonly Subject[] = []): SubjectsRepository => {
  const rows: Subject[] = [...seed];
  return {
    findById: async (userId, id) => rows.filter(visibleTo(userId)).find((subject) => subject.id === id),
    search: async ({ userId, kind, query, limit }) =>
      rows
        .filter(visibleTo(userId))
        .filter((subject) => subject.kind === kind && subject.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, limit),
    insert: async (subject) => {
      if (rows.some((row) => sameScope(row, subject))) return false;
      rows.push(subject);
      return true;
    },
  };
};
