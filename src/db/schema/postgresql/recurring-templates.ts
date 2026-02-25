import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  index,
  pgPolicy,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { workspaces } from './workspaces';
import { users } from './users';
import { categories } from './categories';
import { accounts } from './accounts';

export const recurringTemplates = pgTable(
  'recurring_templates',
  {
    id: text('id').primaryKey(),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    created_by_user_id: text('created_by_user_id')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(),
    type: text('type', { enum: ['expense', 'income'] }).notNull(),
    amount: text('amount').notNull(),
    currency: text('currency').notNull(),
    category_id: text('category_id')
      .notNull()
      .references(() => categories.id),
    account_id: text('account_id')
      .notNull()
      .references(() => accounts.id),
    day_of_month: integer('day_of_month').notNull(),
    start_date: text('start_date').notNull(),
    end_date: text('end_date'),
    total_occurrences: integer('total_occurrences'),
    is_installment: boolean('is_installment').default(false).notNull(),
    installment_label: text('installment_label'),
    starting_occurrence_number: integer('starting_occurrence_number').default(1).notNull(),
    description: text('description'),
    status: text('status', { enum: ['active', 'paused', 'completed', 'cancelled'] })
      .default('active')
      .notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    check(
      'recurring_templates_installment_requires_total_occurrences',
      sql`NOT ${table.is_installment} OR ${table.total_occurrences} IS NOT NULL`
    ),
    index('recurring_templates_workspace_id_idx').on(table.workspace_id),
    index('recurring_templates_workspace_id_status_idx').on(table.workspace_id, table.status),
    index('recurring_templates_category_id_idx').on(table.category_id),
    pgPolicy('recurring_templates_allow_all', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
).enableRLS();
