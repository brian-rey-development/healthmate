import { err, ok, type Result } from '../../shared/domain/result';
import type { Clock } from '../../shared/ports/clock';
import { createDisplayName, type User } from '../domain/user';
import type { UsersRepository } from '../ports/users-repository';

export type CreateUserDeps = { readonly users: UsersRepository; readonly clock: Clock };

// The id is the id of the auth identity, so the profile and the login share it.
export type CreateUserInput = { readonly id: string; readonly displayName: string };

export type CreateUserError = 'invalid_display_name' | 'already_exists';

export const createUser = async (
  { users, clock }: CreateUserDeps,
  input: CreateUserInput,
): Promise<Result<User, CreateUserError>> => {
  const displayName = createDisplayName(input.displayName);
  if (!displayName.ok) return displayName;
  const user = { id: input.id, displayName: displayName.value };
  return (await users.insert(user, clock.now())) ? ok(user) : err('already_exists');
};
