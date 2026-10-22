import type { User } from '../domain/user';

export interface UsersRepository {
  findById(id: string): Promise<User | undefined>;
  // False when a user with this id already exists.
  insert(user: User, createdAt: Date): Promise<boolean>;
}
