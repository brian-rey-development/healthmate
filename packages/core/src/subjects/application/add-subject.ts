import { err, ok, type Result } from '../../shared/domain/result';
import type { Clock } from '../../shared/ports/clock';
import type { IdGenerator } from '../../shared/ports/id-generator';
import { createSubjectName, type Subject, type SubjectKind } from '../domain/subject';
import type { SubjectsRepository } from '../ports/subjects-repository';

export type AddSubjectDeps = {
  readonly subjects: SubjectsRepository;
  readonly ids: IdGenerator;
  readonly clock: Clock;
};

export type AddSubjectInput = { readonly userId: string; readonly kind: SubjectKind; readonly name: string };

export type AddSubjectError = 'subject_name_invalid' | 'subject_name_taken';

export const addSubject = async (
  { subjects, ids, clock }: AddSubjectDeps,
  input: AddSubjectInput,
): Promise<Result<Subject, AddSubjectError>> => {
  const name = createSubjectName(input.name);
  if (!name.ok) return name;
  const subject: Subject = { id: ids.next(), userId: input.userId, kind: input.kind, name: name.value };
  return (await subjects.insert(subject, clock.now())) ? ok(subject) : err('subject_name_taken');
};
