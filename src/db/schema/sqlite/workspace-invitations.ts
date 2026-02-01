import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { workspaces } from './workspaces';

export const workspaceInvitations = sqliteTable('workspace_invitations', {
  id: text('id').primaryKey(),
  workspace_id: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  invited_by_user_id: text('invited_by_user_id'),
  role: text('role', { enum: ['admin', 'member'] }).notNull(),
  expires_at: integer('expires_at', { mode: 'timestamp' }).notNull(),
  accepted_at: integer('accepted_at', { mode: 'timestamp' }),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});
