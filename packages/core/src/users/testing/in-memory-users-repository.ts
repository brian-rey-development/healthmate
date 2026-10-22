import type { User } from '../domain/user';
import type { UsersRepository } from '../ports/users-repository';

export type InMemoryUsersRepository = UsersRepository & { createdAtOf(id: string): Date | undefined };

const SEED_CREATED_AT = new Date(0);

type Stored = { readonly user: User; readonly createdAt: Date };

export const inMemoryUsersRepository = (seed: readonly User[] = []): InMemoryUsersRepository => {
  const rows = new Map<string, Stored>(seed.map((user) => [user.id, { user: { ...user }, createdAt: SEED_CREATED_AT }]));
  return {
    findById: async (id) => {
      const stored = rows.get(id);
      return stored && { ...stored.user };
    },
    insert: async (user, createdAt) => {
      if (rows.has(user.id)) return false;
      rows.set(user.id, { user: { ...user }, createdAt: new Date(createdAt) });
      return true;
    },
    createdAtOf: (id) => {
      const stored = rows.get(id);
      return stored && new Date(stored.createdAt);
    },
  };
};
