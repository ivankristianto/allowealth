import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';

export const oauthConsent = sqliteTable('oauthConsent', {
  id: text('id').primaryKey(),
  clientId: text('clientId').notNull(),
  userId: text('userId').notNull(),
  scopes: text('scopes').notNull(),
  consentGiven: integer('consentGiven', { mode: 'boolean' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});
