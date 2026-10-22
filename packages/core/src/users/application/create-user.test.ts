import { describe, expect, it } from 'vitest';
import { fixedClock } from '../../shared/testing/fixed-clock';
import { MAX_DISPLAY_NAME_LENGTH } from '../domain/user';
import { inMemoryUsersRepository } from '../testing/in-memory-users-repository';
import { createUser } from './create-user';

const NOW = new Date('2026-03-15T10:00:00Z');
const clock = fixedClock(NOW);
const ana = { id: 'user-1', displayName: 'Ana' };

describe('createUser', () => {
  it('returns the user with a trimmed display name', async () => {
    const users = inMemoryUsersRepository();

    const result = await createUser({ users, clock }, { id: 'user-1', displayName: '  Ana  ' });

    expect(result).toEqual({ ok: true, value: ana });
  });

  it('saves the user', async () => {
    const users = inMemoryUsersRepository();

    await createUser({ users, clock }, { id: 'user-1', displayName: 'Ana' });

    expect(await users.findById('user-1')).toEqual(ana);
  });

  it('stores the time of the clock as the creation time', async () => {
    const users = inMemoryUsersRepository();

    await createUser({ users, clock }, { id: 'user-1', displayName: 'Ana' });

    expect(users.createdAtOf('user-1')).toEqual(NOW);
  });

  it('rejects a blank display name', async () => {
    const users = inMemoryUsersRepository();

    expect(await createUser({ users, clock }, { id: 'user-1', displayName: '   ' })).toEqual({
      ok: false,
      error: 'display_name_invalid',
    });
  });

  it('accepts a display name of 80 characters', async () => {
    const users = inMemoryUsersRepository();
    const displayName = 'a'.repeat(MAX_DISPLAY_NAME_LENGTH);

    expect(await createUser({ users, clock }, { id: 'user-1', displayName })).toEqual({
      ok: true,
      value: { id: 'user-1', displayName },
    });
  });

  it('rejects a display name of 81 characters', async () => {
    const users = inMemoryUsersRepository();
    const displayName = 'a'.repeat(MAX_DISPLAY_NAME_LENGTH + 1);

    expect(await createUser({ users, clock }, { id: 'user-1', displayName })).toEqual({
      ok: false,
      error: 'display_name_invalid',
    });
  });

  it('keeps the first user when the same id signs up twice', async () => {
    const users = inMemoryUsersRepository([ana]);

    expect(await createUser({ users, clock }, { id: 'user-1', displayName: 'Bea' })).toEqual({
      ok: false,
      error: 'user_already_exists',
    });
    expect(await users.findById('user-1')).toEqual(ana);
  });
});
