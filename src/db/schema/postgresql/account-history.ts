import { pgTable, text, timestamp, index, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { accounts } from './accounts';

export const accountHistory = pgTable(
  'account_history',
  {
    id: text('id').primaryKey(),
    account_id: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    balance: text('balance').notNull(), // Stored as string for decimal precision
    // P2: TODO - Consider using numeric type for PostgreSQL native decimal support
    notes: text('notes'),
    recorded_at: timestamp('recorded_at').defaultNow().notNull(),
  },
  (table) => [
    index('account_history_recorded_at_idx').on(table.recorded_at),
    index('account_history_account_id_idx').on(table.account_id),
    index('account_history_account_recorded_idx').on(table.account_id, table.recorded_at),
    pgPolicy('account_history_allow_all', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
).enableRLS();
