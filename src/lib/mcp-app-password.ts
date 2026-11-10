/**
 * App passwords: long-lived personal access tokens for MCP clients that cannot
 * run the OAuth consent flow (cron jobs, CI, headless agents). No DB imports,
 * so client scripts can share these constants.
 */

export const APP_PASSWORD_PREFIX = 'aw_pat_';

export const APP_PASSWORD_SCOPES = ['read', 'read-write'] as const;
export type AppPasswordScope = (typeof APP_PASSWORD_SCOPES)[number];

export const APP_PASSWORD_EXPIRY_OPTIONS = ['30', '90', '365', 'never'] as const;
export type AppPasswordExpiryOption = (typeof APP_PASSWORD_EXPIRY_OPTIONS)[number];
export const DEFAULT_APP_PASSWORD_EXPIRY: AppPasswordExpiryOption = '90';

export const APP_PASSWORD_NAME_MAX_LENGTH = 64;
export const MAX_APP_PASSWORDS_PER_USER = 20;

/** Creating a token needs a session signed in within this window. */
export const APP_PASSWORD_REAUTH_WINDOW_MS = 15 * 60 * 1000;

const TOKEN_HINT_SECRET_CHARS = 4;
const TOKEN_RANDOM_BYTES = 32;

export function isAppPasswordToken(token: string): boolean {
  return token.startsWith(APP_PASSWORD_PREFIX);
}

export function generateAppPasswordToken(): string {
  const bytes = new Uint8Array(TOKEN_RANDOM_BYTES);
  crypto.getRandomValues(bytes);
  return `${APP_PASSWORD_PREFIX}${Buffer.from(bytes).toString('base64url')}`;
}

/** Non-secret prefix shown in the UI so users can tell tokens apart. */
export function getAppPasswordHint(token: string): string {
  return token.slice(0, APP_PASSWORD_PREFIX.length + TOKEN_HINT_SECRET_CHARS);
}

export function expiryOptionToDays(option: AppPasswordExpiryOption): number | null {
  return option === 'never' ? null : Number(option);
}

export function isRecentSignIn(
  sessionCreatedAt: Date | string | number,
  now = Date.now()
): boolean {
  const createdAtMs = new Date(sessionCreatedAt).getTime();
  if (!Number.isFinite(createdAtMs)) return false;
  return now - createdAtMs <= APP_PASSWORD_REAUTH_WINDOW_MS;
}
