import { createAuthClient } from 'better-auth/client';
import { twoFactorClient } from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';
const AUTH_PATH_PREFIX = '/api/auth';

/**
 * Resolve the auth client origin.
 *
 * In the browser: use `window.location.origin` (always correct).
 * During SSR: fall back to PUBLIC_URL or localhost.
 *
 * IMPORTANT: Do NOT import `@/lib/env` here — this module is bundled into
 * the client JS and that import drags in a `cloudflare:workers` dynamic
 * import IIFE that violates CSP in the browser.
 */
const authClientOrigin =
  typeof window !== 'undefined'
    ? window.location.origin
    : (import.meta.env.PUBLIC_URL as string | undefined) ||
      `http://localhost:${(import.meta.env.PORT as string | undefined) ?? '4321'}`;

export const authClient = createAuthClient({
  baseURL: new URL(AUTH_PATH_PREFIX, authClientOrigin).toString(),
  plugins: [twoFactorClient(), passkeyClient()],
});
