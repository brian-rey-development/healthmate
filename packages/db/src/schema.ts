import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { authUsers } from 'drizzle-orm/supabase';

export const users = pgTable('users', {
  id: uuid().primaryKey().references(() => authUsers.id, { onDelete: 'restrict' }),
  displayName: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull(),
}).enableRLS();

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
