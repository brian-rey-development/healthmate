import type { Subject, SubjectKind } from '../domain/subject';

export type SubjectSearch = {
  readonly userId: string;
  readonly kind: SubjectKind;
  readonly query: string;
  readonly limit: number;
};

export interface SubjectsRepository {
  findById(userId: string, id: string): Promise<Subject | undefined>;
  // Case-insensitive literal substring or close match, best match first, then name, then id. The limit is at least 1.
  search(search: SubjectSearch): Promise<Subject[]>;
  // False when the same owner already has this name in this kind, in any case. A seed subject has no owner.
  insert(subject: Subject, createdAt: Date): Promise<boolean>;
}
