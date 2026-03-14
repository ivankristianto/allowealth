import { createAuthClient } from 'better-auth/client';
import { twoFactorClient } from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';
import { getEnv } from '@/lib/env';

const AUTH_PATH_PREFIX = '/api/auth';

const authClientOrigin =
  typeof window !== 'undefined'
    ? window.location.origin
    : getEnv('PUBLIC_URL') || `http://localhost:${getEnv('PORT') ?? '4321'}`;

export const authClient = createAuthClient({
  baseURL: new URL(AUTH_PATH_PREFIX, authClientOrigin).toString(),
  plugins: [twoFactorClient(), passkeyClient()],
});
