import { pgTable, text, timestamp, index, unique, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

/**
 * User Meta Table (PostgreSQL)
 *
 * Flexible key-value storage for user preferences and settings.
 * Replaces the old user_settings table with a more extensible design.
 *
 * Security notes:
 * - meta_key must be validated against an allowlist at the service layer
 * - meta_value is limited to 4KB at the service layer
 * - Users can only access their own meta (enforced via user_id)
 */
export const userMeta = pgTable(
  'user_meta',
  {
    meta_id: text('meta_id').primaryKey(),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    meta_key: text('meta_key').notNull(),
    meta_value: text('meta_value').notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    unique('user_meta_user_key_unique').on(table.user_id, table.meta_key),
    index('idx_user_meta_user_id').on(table.user_id),
    pgPolicy('user_meta_allow_all', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
).enableRLS();
