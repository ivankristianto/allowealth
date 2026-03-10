import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor } from 'better-auth/plugins';
import { db } from '@/db';
import * as schema from '@/db/schema/sqlite';
import { createLogger } from '@/lib/logger';
import { EmailService } from '@/services/email';
import { beforeAuthUserCreate, bootstrapAuthUser } from '@/services/auth.service';

export const AUTH_PATH_PREFIX = '/api/auth';
export const AUTH_SESSION_COOKIE_NAME = 'better-auth.session_token';

const baseURL = process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? '4321'}`;
const secret =
  process.env.BETTER_AUTH_SECRET ??
  (process.env.NODE_ENV === 'production'
    ? undefined
    : 'better-auth-dev-secret-for-local-development-only-0123456789');
const logger = createLogger('better-auth');

if (!secret) {
  throw new Error('BETTER_AUTH_SECRET must be set in production');
}
const emailService = new EmailService();

export const auth = betterAuth({
  baseURL,
  basePath: AUTH_PATH_PREFIX,
  secret,
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema,
  }),
  account: {
    accountLinking: {
      disableImplicitLinking: true,
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user, context) => {
          await beforeAuthUserCreate(user, context);
        },
        after: async (user, context) => {
          await bootstrapAuthUser(user, context);
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      if (!user.email) {
        return;
      }

      if (emailService.isConfigured()) {
        await emailService.sendPasswordReset({
          to: user.email,
          resetUrl: url,
          expiresIn: '1 hour',
        });
        return;
      }

      logger.info(`password reset URL for ${user.email}: ${url}`);
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || 'test-google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'test-google-client-secret',
    },
  },
  plugins: [twoFactor()],
});
