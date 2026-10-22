import type { User, UsersRepository } from '@healthmate/core';
import { eq } from 'drizzle-orm';
import type { Executor } from '../executor';
import { first, wroteRow } from '../rows';
import { users, type UserRow } from './users.table';

const toUser = ({ id, displayName }: UserRow): User => ({ id, displayName });

const findById =
  (db: Executor): UsersRepository['findById'] =>
  async (id) => {
    const row = first(await db.select().from(users).where(eq(users.id, id)));
    return row && toUser(row);
  };

// Only a duplicate id is an expected conflict. A missing auth user still throws.
const insert =
  (db: Executor): UsersRepository['insert'] =>
  async (user, createdAt) =>
    wroteRow(
      await db
        .insert(users)
        .values({ ...user, createdAt })
        .onConflictDoNothing({ target: users.id })
        .returning({ id: users.id }),
    );

export const createUsersRepository = (db: Executor): UsersRepository => ({
  findById: findById(db),
  insert: insert(db),
});
