import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { users } from './users';

export const apiKeys = pgTable(
  'api_keys',
  {
    id: text('id').primaryKey(),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    key_hash: text('key_hash').notNull(),
    key_prefix: text('key_prefix').notNull(),
    last_used_at: timestamp('last_used_at'),
    expires_at: timestamp('expires_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => [
    index('api_keys_workspace_id_idx').on(table.workspace_id),
    index('api_keys_key_prefix_idx').on(table.key_prefix),
  ]
);
