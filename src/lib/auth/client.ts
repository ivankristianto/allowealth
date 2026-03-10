import { createAuthClient } from 'better-auth/client';
import { twoFactorClient } from 'better-auth/client/plugins';
import { AUTH_PATH_PREFIX } from './server';

export const authClient = createAuthClient({
  baseURL: AUTH_PATH_PREFIX,
  plugins: [twoFactorClient()],
});
