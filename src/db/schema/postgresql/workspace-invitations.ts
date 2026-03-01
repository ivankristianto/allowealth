import { pgTable, text, timestamp, index, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { workspaces } from './workspaces';

export const workspaceInvitations = pgTable(
  'workspace_invitations',
  {
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
  },
  (table) => [
    index('workspace_invitations_workspace_id_idx').on(table.workspace_id),
    index('workspace_invitations_ws_accept_expire_created_idx').on(
      table.workspace_id,
      table.accepted_at,
      table.expires_at,
      table.created_at
    ),
    pgPolicy('workspace_invitations_allow_all', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
).enableRLS();
