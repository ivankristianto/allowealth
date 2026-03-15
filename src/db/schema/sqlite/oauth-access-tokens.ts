import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';

export const oauthAccessToken = sqliteTable(
  'oauthAccessToken',
  {
    id: text('id').primaryKey(),
    accessToken: text('accessToken').notNull(),
    refreshToken: text('refreshToken').notNull(),
    accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }).notNull(),
    refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp' }).notNull(),
    clientId: text('clientId').notNull(),
    userId: text('userId'),
    scopes: text('scopes').notNull(),
    createdAt: integer('createdAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => [
    uniqueIndex('oauthAccessToken_accessToken_idx').on(table.accessToken),
    uniqueIndex('oauthAccessToken_refreshToken_idx').on(table.refreshToken),
  ]
);
