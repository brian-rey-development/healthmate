import { describe, expect, it } from 'vitest';
import { fixedClock } from '../../shared/testing/fixed-clock';
import { sequentialIds } from '../../shared/testing/sequential-ids';
import { MAX_SUBJECT_NAME_LENGTH, type Subject } from '../domain/subject';
import { inMemorySubjectsRepository } from '../testing/in-memory-subjects-repository';
import { addSubject, type AddSubjectInput } from './add-subject';

const NOW = new Date('2026-03-15T10:00:00Z');
const clock = fixedClock(NOW);
const input: AddSubjectInput = { userId: 'user-1', kind: 'symptom', name: ' Migraine ' };
const migraineOf = (userId: string | null): Subject => ({ id: 's-1', userId, kind: 'symptom', name: 'migraine' });

describe('addSubject', () => {
  it('saves a personal subject with a new id and a trimmed name', async () => {
    const subjects = inMemorySubjectsRepository();

    const result = await addSubject({ subjects, ids: sequentialIds('subject'), clock }, input);

    expect(result).toEqual({
      ok: true,
      value: { id: 'subject-1', userId: 'user-1', kind: 'symptom', name: 'Migraine' },
    });
  });

  it('stores the time of the clock as the creation time', async () => {
    const subjects = inMemorySubjectsRepository();

    await addSubject({ subjects, ids: sequentialIds('subject'), clock }, input);

    expect(subjects.createdAtOf('subject-1')).toEqual(NOW);
  });

  it('rejects a name that the person already has, in any case', async () => {
    const subjects = inMemorySubjectsRepository([migraineOf('user-1')]);

    expect(await addSubject({ subjects, ids: sequentialIds(), clock }, input)).toEqual({
      ok: false,
      error: 'subject_name_taken',
    });
  });

  it('allows the same name for another user', async () => {
    const subjects = inMemorySubjectsRepository([migraineOf('user-2')]);

    const result = await addSubject({ subjects, ids: sequentialIds(), clock }, input);

    expect(result).toMatchObject({ ok: true });
  });

  it('allows a name that a seed subject has', async () => {
    const subjects = inMemorySubjectsRepository([migraineOf(null)]);

    const result = await addSubject({ subjects, ids: sequentialIds(), clock }, input);

    expect(result).toMatchObject({ ok: true });
  });

  it('rejects a blank name', async () => {
    const subjects = inMemorySubjectsRepository();

    expect(await addSubject({ subjects, ids: sequentialIds(), clock }, { ...input, name: '  ' })).toEqual({
      ok: false,
      error: 'subject_name_invalid',
    });
  });

  it('accepts a name of 60 characters', async () => {
    const subjects = inMemorySubjectsRepository();
    const name = 'a'.repeat(MAX_SUBJECT_NAME_LENGTH);

    expect(await addSubject({ subjects, ids: sequentialIds(), clock }, { ...input, name })).toMatchObject({ ok: true });
  });

  it('rejects a name of 61 characters', async () => {
    const subjects = inMemorySubjectsRepository();
    const name = 'a'.repeat(MAX_SUBJECT_NAME_LENGTH + 1);

    expect(await addSubject({ subjects, ids: sequentialIds(), clock }, { ...input, name })).toEqual({
      ok: false,
      error: 'subject_name_invalid',
    });
  });
});
