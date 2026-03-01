import { pgTable, text, integer, timestamp, index, unique, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { recurringTemplates } from './recurring-templates';
import { workspaces } from './workspaces';
import { transactions } from './transactions';

export const recurringOccurrences = pgTable(
  'recurring_occurrences',
  {
    id: text('id').primaryKey(),
    template_id: text('template_id')
      .notNull()
      .references(() => recurringTemplates.id, { onDelete: 'cascade' }),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    due_date: text('due_date').notNull(),
    occurrence_number: integer('occurrence_number').notNull(),
    status: text('status', { enum: ['pending', 'confirmed', 'skipped'] })
      .default('pending')
      .notNull(),
    transaction_id: text('transaction_id')
      .unique()
      .references(() => transactions.id),
    confirmed_amount: text('confirmed_amount'),
    skip_reason: text('skip_reason'),
    confirmed_at: timestamp('confirmed_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    unique('recurring_occurrences_template_occurrence_unique').on(
      table.template_id,
      table.occurrence_number
    ),
    index('recurring_occurrences_template_id_idx').on(table.template_id),
    index('recurring_occurrences_workspace_id_status_idx').on(table.workspace_id, table.status),
    index('recurring_occurrences_workspace_id_due_date_idx').on(table.workspace_id, table.due_date),
    index('recurring_occurrences_ws_status_due_date_idx').on(
      table.workspace_id,
      table.status,
      table.due_date
    ),
    pgPolicy('recurring_occurrences_allow_all', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
).enableRLS();
