import type { User } from '../domain/user';
import type { UsersRepository } from '../ports/users-repository';

export const inMemoryUsersRepository = (seed: readonly User[] = []): UsersRepository => {
  const rows = new Map(seed.map((user) => [user.id, user]));
  return {
    findById: async (id) => rows.get(id),
    insert: async (user) => {
      if (rows.has(user.id)) return false;
      rows.set(user.id, user);
      return true;
    },
  };
};
