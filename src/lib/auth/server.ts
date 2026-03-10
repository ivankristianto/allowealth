import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor } from 'better-auth/plugins';
import { db } from '@/db';
import * as schema from '@/db/schema/sqlite';

const baseURL = process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? '4321'}`;
const secret =
  process.env.BETTER_AUTH_SECRET ??
  process.env.SESSION_SECRET ??
  'better-auth-dev-secret-change-me';

export const auth = betterAuth({
  baseURL,
  secret,
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || 'test-google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'test-google-client-secret',
    },
  },
  plugins: [twoFactor()],
});
