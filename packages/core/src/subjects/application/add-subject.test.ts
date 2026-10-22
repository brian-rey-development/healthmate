import { describe, expect, it } from 'vitest';
import { fixedClock } from '../../shared/testing/fixed-clock';
import { sequentialIds } from '../../shared/testing/sequential-ids';
import { inMemorySubjectsRepository } from '../testing/in-memory-subjects-repository';
import { addSubject, type AddSubjectInput } from './add-subject';

const clock = fixedClock(new Date('2026-03-15T10:00:00Z'));
const input: AddSubjectInput = { userId: 'user-1', kind: 'symptom', name: ' Migraine ' };

describe('addSubject', () => {
  it('saves a personal subject with a new id and a trimmed name', async () => {
    const subjects = inMemorySubjectsRepository();

    const result = await addSubject({ subjects, ids: sequentialIds('subject'), clock }, input);

    expect(result).toEqual({
      ok: true,
      value: { id: 'subject-1', userId: 'user-1', kind: 'symptom', name: 'Migraine' },
    });
  });

  it('rejects a name that the person already has, in any case', async () => {
    const subjects = inMemorySubjectsRepository([{ id: 's-1', userId: 'user-1', kind: 'symptom', name: 'migraine' }]);

    expect(await addSubject({ subjects, ids: sequentialIds(), clock }, input)).toEqual({
      ok: false,
      error: 'duplicate_name',
    });
  });

  it('rejects a blank name', async () => {
    const subjects = inMemorySubjectsRepository();

    expect(await addSubject({ subjects, ids: sequentialIds(), clock }, { ...input, name: '  ' })).toEqual({
      ok: false,
      error: 'invalid_name',
    });
  });
});
