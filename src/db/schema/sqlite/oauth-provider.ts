import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { user } from './better-auth';

/**
 * Tables for `@better-auth/oauth-provider` (Better Auth 1.7), the OAuth
 * authorization server behind MCP access tokens.
 *
 * Storage conventions the Better Auth SQLite adapter relies on:
 * - `string[]` and `json` fields are JSON text (plain `text` columns, not
 *   Drizzle `mode: 'json'`, which would serialize a second time).
 * - Token values are stored hashed (`hashOAuthToken`), never in plain text.
 * - `sessionId` has no foreign key: sessions created before Better Auth 1.7
 *   (when Redis secondary storage held them exclusively) have no SQLite row,
 *   and `PRAGMA foreign_keys = ON` would reject tokens bound to them.
 */

export const oauthClient = sqliteTable(
  'oauthClient',
  {
    id: text('id').primaryKey(),
    clientId: text('clientId').notNull(),
    clientSecret: text('clientSecret'),
    clientDiscoveryId: text('clientDiscoveryId'),
    disabled: integer('disabled', { mode: 'boolean' }).default(false),
    skipConsent: integer('skipConsent', { mode: 'boolean' }),
    enableEndSession: integer('enableEndSession', { mode: 'boolean' }),
    subjectType: text('subjectType'),
    scopes: text('scopes'),
    clientCredentialsScopes: text('clientCredentialsScopes'),
    userId: text('userId').references(() => user.id, { onDelete: 'cascade' }),
    createdAt: integer('createdAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    name: text('name'),
    uri: text('uri'),
    icon: text('icon'),
    contacts: text('contacts'),
    tos: text('tos'),
    policy: text('policy'),
    softwareId: text('softwareId'),
    softwareVersion: text('softwareVersion'),
    softwareStatement: text('softwareStatement'),
    redirectUris: text('redirectUris').notNull(),
    postLogoutRedirectUris: text('postLogoutRedirectUris'),
    backchannelLogoutUri: text('backchannelLogoutUri'),
    backchannelLogoutSessionRequired: integer('backchannelLogoutSessionRequired', {
      mode: 'boolean',
    }),
    tokenEndpointAuthMethod: text('tokenEndpointAuthMethod'),
    applicationType: text('applicationType'),
    jwks: text('jwks'),
    jwksUri: text('jwksUri'),
    grantTypes: text('grantTypes'),
    responseTypes: text('responseTypes'),
    requirePKCE: integer('requirePKCE', { mode: 'boolean' }),
    dpopBoundAccessTokens: integer('dpopBoundAccessTokens', { mode: 'boolean' }),
    referenceId: text('referenceId'),
    metadata: text('metadata'),
  },
  (table) => [
    uniqueIndex('oauthClient_clientId_idx').on(table.clientId),
    index('oauthClient_userId_idx').on(table.userId),
  ]
);

export const oauthResource = sqliteTable(
  'oauthResource',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    name: text('name').notNull(),
    accessTokenTtl: integer('accessTokenTtl'),
    refreshTokenTtl: integer('refreshTokenTtl'),
    signingAlgorithm: text('signingAlgorithm'),
    signingKeyId: text('signingKeyId'),
    allowedScopes: text('allowedScopes'),
    customClaims: text('customClaims'),
    dpopBoundAccessTokensRequired: integer('dpopBoundAccessTokensRequired', { mode: 'boolean' }),
    disabled: integer('disabled', { mode: 'boolean' }),
    createdAt: integer('createdAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    policyVersion: integer('policyVersion'),
    metadata: text('metadata'),
  },
  (table) => [uniqueIndex('oauthResource_identifier_idx').on(table.identifier)]
);

export const oauthClientResource = sqliteTable(
  'oauthClientResource',
  {
    id: text('id').primaryKey(),
    clientId: text('clientId')
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: 'cascade' }),
    resourceId: text('resourceId')
      .notNull()
      .references(() => oauthResource.identifier, { onDelete: 'cascade' }),
    metadata: text('metadata'),
    createdAt: integer('createdAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => [
    uniqueIndex('oauthClientResource_clientId_resourceId_idx').on(table.clientId, table.resourceId),
    index('oauthClientResource_resourceId_idx').on(table.resourceId),
  ]
);

export const oauthRefreshToken = sqliteTable(
  'oauthRefreshToken',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull(),
    clientId: text('clientId')
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: 'cascade' }),
    sessionId: text('sessionId'),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    referenceId: text('referenceId'),
    authorizationCodeId: text('authorizationCodeId'),
    resources: text('resources'),
    requestedUserInfoClaims: text('requestedUserInfoClaims'),
    expiresAt: integer('expiresAt', { mode: 'timestamp' }),
    createdAt: integer('createdAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    revoked: integer('revoked', { mode: 'timestamp' }),
    rotatedAt: integer('rotatedAt', { mode: 'timestamp' }),
    rotationReplayResponse: text('rotationReplayResponse'),
    rotationReplayExpiresAt: integer('rotationReplayExpiresAt', { mode: 'timestamp' }),
    authTime: integer('authTime', { mode: 'timestamp' }),
    confirmation: text('confirmation'),
    scopes: text('scopes').notNull(),
  },
  (table) => [
    uniqueIndex('oauthRefreshToken_token_idx').on(table.token),
    index('oauthRefreshToken_clientId_idx').on(table.clientId),
    index('oauthRefreshToken_sessionId_idx').on(table.sessionId),
    index('oauthRefreshToken_userId_idx').on(table.userId),
    index('oauthRefreshToken_authorizationCodeId_idx').on(table.authorizationCodeId),
  ]
);

export const oauthAccessToken = sqliteTable(
  'oauthAccessToken',
  {
    id: text('id').primaryKey(),
    token: text('token'),
    clientId: text('clientId')
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: 'cascade' }),
    sessionId: text('sessionId'),
    userId: text('userId').references(() => user.id, { onDelete: 'cascade' }),
    referenceId: text('referenceId'),
    authorizationCodeId: text('authorizationCodeId'),
    resources: text('resources'),
    requestedUserInfoClaims: text('requestedUserInfoClaims'),
    refreshId: text('refreshId').references(() => oauthRefreshToken.id, { onDelete: 'cascade' }),
    expiresAt: integer('expiresAt', { mode: 'timestamp' }),
    createdAt: integer('createdAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    revoked: integer('revoked', { mode: 'timestamp' }),
    confirmation: text('confirmation'),
    scopes: text('scopes').notNull(),
  },
  (table) => [
    uniqueIndex('oauthAccessToken_token_idx').on(table.token),
    index('oauthAccessToken_clientId_idx').on(table.clientId),
    index('oauthAccessToken_sessionId_idx').on(table.sessionId),
    index('oauthAccessToken_userId_idx').on(table.userId),
    index('oauthAccessToken_authorizationCodeId_idx').on(table.authorizationCodeId),
    index('oauthAccessToken_refreshId_idx').on(table.refreshId),
  ]
);

export const oauthConsent = sqliteTable(
  'oauthConsent',
  {
    id: text('id').primaryKey(),
    clientId: text('clientId')
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: 'cascade' }),
    userId: text('userId').references(() => user.id, { onDelete: 'cascade' }),
    referenceId: text('referenceId'),
    resources: text('resources'),
    requestedUserInfoClaims: text('requestedUserInfoClaims'),
    scopes: text('scopes').notNull(),
    createdAt: integer('createdAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => [
    index('oauthConsent_clientId_idx').on(table.clientId),
    index('oauthConsent_userId_idx').on(table.userId),
  ]
);

export const oauthClientAssertion = sqliteTable(
  'oauthClientAssertion',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  },
  (table) => [index('oauthClientAssertion_expiresAt_idx').on(table.expiresAt)]
);
