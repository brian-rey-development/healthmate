import { describe, expect, it } from 'vitest';
import type { Subject } from '../domain/subject';
import { inMemorySubjectsRepository } from './in-memory-subjects-repository';

const subject = (id: string, name: string, userId: string | null = null): Subject => ({
  id,
  userId,
  kind: 'symptom',
  name,
});

const SEEDS = [subject('s-3', 'Chronic headache'), subject('s-2', 'Headache'), subject('s-1', 'Headaches')];
const search = (query: string, limit = 10, userId = 'user-1') => ({ userId, kind: 'symptom' as const, query, limit });

describe('inMemorySubjectsRepository search', () => {
  it('ranks an exact name, then a prefix, then any substring', async () => {
    const subjects = inMemorySubjectsRepository(SEEDS);

    const found = await subjects.search(search('headache'));

    expect(found.map((s) => s.id)).toEqual(['s-2', 's-1', 's-3']);
  });

  it('applies the limit', async () => {
    const subjects = inMemorySubjectsRepository(SEEDS);

    expect(await subjects.search(search('headache', 1))).toEqual([SEEDS[1]]);
  });

  it('hides the private subject of another user', async () => {
    const subjects = inMemorySubjectsRepository([subject('s-9', 'Migraine', 'user-2')]);

    expect(await subjects.search(search('migraine'))).toEqual([]);
  });

  it('refuses a limit below 1', async () => {
    const subjects = inMemorySubjectsRepository(SEEDS);

    await expect(subjects.search(search('headache', 0))).rejects.toThrow(RangeError);
  });
});
