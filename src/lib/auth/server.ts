import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor } from 'better-auth/plugins';
import { db } from '@/db';
import * as schema from '@/db/schema/sqlite';
import { getEnv } from '@/lib/env';
import { createLogger } from '@/lib/logger';
import { EmailService } from '@/services/email';
import { beforeAuthUserCreate, bootstrapAuthUser } from '@/services/auth.service';

export const AUTH_PATH_PREFIX = '/api/auth';
export const AUTH_SESSION_COOKIE_NAME = 'better-auth.session_token';

const nodeEnv = getEnv('NODE_ENV');
const isTest = nodeEnv === 'test';
const isProduction = nodeEnv === 'production';
const secret = getEnv('BETTER_AUTH_SECRET');
const logger = createLogger('better-auth');

if (!secret) {
  throw new Error('BETTER_AUTH_SECRET must be set');
}

const googleClientId =
  getEnv('GOOGLE_CLIENT_ID') ?? (isProduction ? undefined : 'test-google-client-id');
const googleClientSecret =
  getEnv('GOOGLE_CLIENT_SECRET') ?? (isProduction ? undefined : 'test-google-client-secret');

if (isProduction && (!googleClientId || !googleClientSecret)) {
  throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in production');
}

const emailService = new EmailService();

function getDevelopmentBaseURL(): string {
  const devHost = getEnv('DEV_HOST');
  const port = getEnv('PORT') ?? '4321';
  return `http://${devHost || 'localhost'}:${port}`;
}

export function getAuthBaseURL(): string {
  return getEnv('PUBLIC_URL') ?? getDevelopmentBaseURL();
}

export function getTrustedOrigins(): string[] {
  const trustedOrigins = [getAuthBaseURL()];

  if (!isProduction && getEnv('DEV_HOST')) {
    trustedOrigins.push(getDevelopmentBaseURL());
  }

  return Array.from(new Set(trustedOrigins));
}

export const auth = betterAuth({
  baseURL: getAuthBaseURL(),
  basePath: AUTH_PATH_PREFIX,
  trustedOrigins: getTrustedOrigins(),
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
      clientId: googleClientId!,
      clientSecret: googleClientSecret!,
    },
  },
  plugins: [twoFactor()],
});
