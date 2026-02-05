import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

export const workspaceInvitations = pgTable('workspace_invitations', {
  id: text('id').primaryKey(),
  workspace_id: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  invited_by_user_id: text('invited_by_user_id'),
  role: text('role', { enum: ['admin', 'member'] }).notNull(),
  expires_at: timestamp('expires_at').notNull(),
  accepted_at: timestamp('accepted_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
}).enableRLS();
