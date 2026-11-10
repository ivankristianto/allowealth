import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { workspaces } from './workspaces';

/** Long-lived MCP tokens (`aw_pat_...`). Only the SHA-256 hash of each token is stored. */
export const mcpAppPasswords = sqliteTable(
  'mcp_app_passwords',
  {
    id: text('id').primaryKey(),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    token_hash: text('token_hash').notNull().unique(),
    token_hint: text('token_hint').notNull(),
    scope: text('scope', { enum: ['read', 'read-write'] }).notNull(),
    expires_at: integer('expires_at', { mode: 'timestamp' }),
    last_used_at: integer('last_used_at', { mode: 'timestamp' }),
    created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [index('mcp_app_passwords_user_id_idx').on(table.user_id)]
);
