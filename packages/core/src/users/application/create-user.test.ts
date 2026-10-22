import { describe, expect, it } from 'vitest';
import { fixedClock } from '../../shared/testing/fixed-clock';
import { inMemoryUsersRepository } from '../testing/in-memory-users-repository';
import { createUser } from './create-user';

const clock = fixedClock(new Date('2026-03-15T10:00:00Z'));

describe('createUser', () => {
  it('saves the user with a trimmed display name', async () => {
    const users = inMemoryUsersRepository();

    const result = await createUser({ users, clock }, { id: 'user-1', displayName: '  Ana  ' });

    expect(result).toEqual({ ok: true, value: { id: 'user-1', displayName: 'Ana' } });
    expect(await users.findById('user-1')).toEqual({ id: 'user-1', displayName: 'Ana' });
  });

  it('rejects a blank display name', async () => {
    const users = inMemoryUsersRepository();

    expect(await createUser({ users, clock }, { id: 'user-1', displayName: '   ' })).toEqual({
      ok: false,
      error: 'invalid_display_name',
    });
  });

  it('keeps the first user when the same id signs up twice', async () => {
    const users = inMemoryUsersRepository([{ id: 'user-1', displayName: 'Ana' }]);

    expect(await createUser({ users, clock }, { id: 'user-1', displayName: 'Bea' })).toEqual({
      ok: false,
      error: 'already_exists',
    });
    expect(await users.findById('user-1')).toMatchObject({ displayName: 'Ana' });
  });
});
