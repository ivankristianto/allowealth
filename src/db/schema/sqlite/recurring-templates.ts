import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { workspaces } from './workspaces';
import { users } from './users';
import { categories } from './categories';
import { accounts } from './accounts';

export const recurringTemplates = sqliteTable(
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
    frequency: text('frequency', { enum: ['weekly', 'monthly'] })
      .default('monthly')
      .notNull(),
    interval_count: integer('interval_count').default(1).notNull(),
    start_date: text('start_date').notNull(),
    end_date: text('end_date'),
    total_occurrences: integer('total_occurrences'),
    is_installment: integer('is_installment', { mode: 'boolean' }).default(false).notNull(),
    installment_label: text('installment_label'),
    starting_occurrence_number: integer('starting_occurrence_number').default(1).notNull(),
    description: text('description'),
    status: text('status', { enum: ['active', 'paused', 'completed', 'cancelled'] })
      .default('active')
      .notNull(),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    updated_at: integer('updated_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => [
    index('recurring_templates_workspace_id_idx').on(table.workspace_id),
    index('recurring_templates_workspace_id_status_idx').on(table.workspace_id, table.status),
    index('recurring_templates_category_id_idx').on(table.category_id),
  ]
);
