/**
 * OAuth Provider Configuration
 *
 * Uses Arctic library for OAuth 2.0 with PKCE support.
 * Arctic uses Web Crypto API internally — compatible with Bun, Node.js, and Cloudflare Workers.
 *
 * @see https://arcticjs.dev/
 */

import { Google } from 'arctic';
import { getEnv } from '@/lib/env';

/**
 * Create Google OAuth client
 *
 * Lazily initialized to avoid errors when env vars are not set (e.g., in tests).
 * Uses getEnv() for cross-runtime compatibility (Workers, Bun, Node).
 */
export function createGoogleOAuthClient(): Google {
  const clientId = getEnv('GOOGLE_CLIENT_ID');
  const clientSecret = getEnv('GOOGLE_CLIENT_SECRET');
  const appUrl = (getEnv('PUBLIC_URL') || 'http://localhost:4321').replace(/\/$/, '');

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured');
  }

  return new Google(clientId, clientSecret, `${appUrl}/api/auth/google/callback`);
}
