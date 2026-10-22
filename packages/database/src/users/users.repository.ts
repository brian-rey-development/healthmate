import { eq } from 'drizzle-orm';
import type { Executor } from '../executor';
import { first, single } from '../rows';
import { users, type NewUserRow, type UserRow } from './users.table';

const findById =
  (db: Executor) =>
  async (id: string): Promise<UserRow | undefined> =>
    first(await db.select().from(users).where(eq(users.id, id)));

const insert =
  (db: Executor) =>
  async (row: NewUserRow): Promise<UserRow> =>
    single(await db.insert(users).values(row).returning());

export const createUsersRepository = (db: Executor) => ({
  findById: findById(db),
  insert: insert(db),
});
