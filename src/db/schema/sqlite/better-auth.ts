import { integer, index, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';

export const user = sqliteTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
    image: text('image'),
    twoFactorEnabled: integer('twoFactorEnabled', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('createdAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => [index('user_email_idx').on(table.email)]
);

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: integer('createdAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    ipAddress: text('ipAddress'),
    userAgent: text('userAgent'),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('session_token_unique').on(table.token),
    index('session_user_id_idx').on(table.userId),
    index('session_expires_at_idx').on(table.expiresAt),
  ]
);

export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('accountId').notNull(),
    providerId: text('providerId').notNull(),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('accessToken'),
    refreshToken: text('refreshToken'),
    idToken: text('idToken'),
    accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }),
    refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp' }),
    scope: text('scope'),
    password: text('password'),
    createdAt: integer('createdAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => [
    index('account_user_id_idx').on(table.userId),
    index('account_provider_id_idx').on(table.providerId),
    uniqueIndex('account_provider_account_unique').on(table.providerId, table.accountId),
  ]
);

export const verification = sqliteTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
    createdAt: integer('createdAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)]
);

export const twoFactor = sqliteTable(
  'twoFactor',
  {
    id: text('id').primaryKey(),
    secret: text('secret').notNull(),
    backupCodes: text('backupCodes').notNull(),
    userId: text('userId')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('two_factor_user_id_idx').on(table.userId),
    index('two_factor_secret_idx').on(table.secret),
  ]
);

export const passkey = sqliteTable(
  'passkey',
  {
    id: text('id').primaryKey(),
    name: text('name'),
    publicKey: text('publicKey').notNull(),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    credentialID: text('credentialID').notNull(),
    counter: integer('counter').notNull(),
    deviceType: text('deviceType').notNull(),
    backedUp: integer('backedUp', { mode: 'boolean' }).notNull(),
    transports: text('transports'),
    aaguid: text('aaguid'),
    createdAt: integer('createdAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => [
    index('passkey_user_id_idx').on(table.userId),
    uniqueIndex('passkey_credential_id_unique').on(table.credentialID),
  ]
);
