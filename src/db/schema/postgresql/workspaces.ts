import { pgTable, text, timestamp, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const workspaces = pgTable(
  'workspaces',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    status: text('status', { enum: ['active', 'inactive'] })
      .notNull()
      .default('active'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  () => [
    pgPolicy('workspaces_allow_all', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
).enableRLS();
