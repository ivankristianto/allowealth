import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  workspace_id: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash'),
  avatar_url: text('avatar_url'),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'member'] }).notNull(),
  email_verified_at: timestamp('email_verified_at'),
  deleted_at: timestamp('deleted_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}).enableRLS();
