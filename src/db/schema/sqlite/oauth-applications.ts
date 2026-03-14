import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';

export const oauthApplication = sqliteTable(
  'oauthApplication',
  {
    id: text('id').primaryKey(),
    clientId: text('clientId').notNull(),
    clientSecret: text('clientSecret'),
    name: text('name').notNull(),
    icon: text('icon'),
    metadata: text('metadata'),
    type: text('type', { enum: ['public', 'web', 'native', 'user-agent-based'] })
      .notNull()
      .default('web'),
    disabled: integer('disabled', { mode: 'boolean' }).default(false),
    redirectUrls: text('redirectUrls').notNull(),
    userId: text('userId'),
    createdAt: integer('createdAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => [uniqueIndex('oauthApplication_clientId_idx').on(table.clientId)]
);
