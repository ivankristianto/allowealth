import { betterAuth } from 'better-auth';
import type { BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { captcha, twoFactor } from 'better-auth/plugins';
import { db } from '@/db';
import * as schema from '@/db/schema/sqlite';
import { getEnv } from '@/lib/env';
import { createLogger } from '@/lib/logger';
import { EmailService } from '@/services/email';
import { beforeAuthUserCreate, bootstrapAuthUser } from '@/services/auth.service';
import { createAuthSecondaryStorage } from './secondary-storage';

export const AUTH_PATH_PREFIX = '/api/auth';
const AUTH_SESSION_COOKIE_BASE = 'better-auth.session_token';

export function getSessionCookieName(): string {
  const baseURL = getAuthBaseURL();
  const useSecureCookies = baseURL.startsWith('https://');
  return useSecureCookies ? `__Secure-${AUTH_SESSION_COOKIE_BASE}` : AUTH_SESSION_COOKIE_BASE;
}

const logger = createLogger('better-auth');

export const AUTH_RATE_LIMIT_RULES = {
  '/sign-in/email': { window: 15 * 60, max: 10 },
  '/sign-up/email': { window: 60 * 60, max: 5 },
  '/request-password-reset': { window: 60 * 60, max: 3 },
  '/sign-in/social': { window: 15 * 60, max: 10 },
} as const;

function getDevelopmentBaseURL(): string {
  const devHost = getEnv('DEV_HOST');
  const port = getEnv('PORT') ?? '4321';
  return `http://${devHost || 'localhost'}:${port}`;
}

export function getAuthBaseURL(): string {
  return getEnv('PUBLIC_URL') ?? getDevelopmentBaseURL();
}

export function getTrustedOrigins(): string[] {
  const nodeEnv = getEnv('NODE_ENV');
  const isProduction = nodeEnv === 'production';
  const trustedOrigins = [getAuthBaseURL()];

  if (!isProduction && getEnv('DEV_HOST')) {
    trustedOrigins.push(getDevelopmentBaseURL());
  }

  return Array.from(new Set(trustedOrigins));
}

function getGoogleClientId(): string | undefined {
  const nodeEnv = getEnv('NODE_ENV');
  const isProduction = nodeEnv === 'production';
  return getEnv('GOOGLE_CLIENT_ID') ?? (isProduction ? undefined : 'test-google-client-id');
}

function getGoogleClientSecret(): string | undefined {
  const nodeEnv = getEnv('NODE_ENV');
  const isProduction = nodeEnv === 'production';
  return getEnv('GOOGLE_CLIENT_SECRET') ?? (isProduction ? undefined : 'test-google-client-secret');
}

function createAuthInstance() {
  const nodeEnv = getEnv('NODE_ENV');
  const isProduction = nodeEnv === 'production';

  const secret = getEnv('BETTER_AUTH_SECRET');
  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET must be set');
  }

  const googleClientId = getGoogleClientId();
  const googleClientSecret = getGoogleClientSecret();

  if (isProduction && (!googleClientId || !googleClientSecret)) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in production');
  }

  const emailService = new EmailService();
  const turnstileSiteKey = getEnv('PUBLIC_TURNSTILE_SITE_KEY');
  const turnstileSecretKey = getEnv('TURNSTILE_SECRET_KEY');
  const authSecondaryStorage = createAuthSecondaryStorage();

  if (isProduction && (!turnstileSiteKey || !turnstileSecretKey)) {
    throw new Error('PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY must be set in production');
  }

  const authPlugins: Array<ReturnType<typeof twoFactor> | ReturnType<typeof captcha>> = [
    twoFactor(),
  ];
  const hasTurnstileConfig = Boolean(turnstileSiteKey && turnstileSecretKey);

  if (hasTurnstileConfig) {
    authPlugins.unshift(
      captcha({
        provider: 'cloudflare-turnstile',
        secretKey: turnstileSecretKey,
      })
    );
  }

  const options: BetterAuthOptions = {
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

        try {
          await emailService.sendPasswordReset({
            to: user.email,
            resetUrl: url,
            expiresIn: '1 hour',
          });
        } catch (error) {
          logger.error('password reset delivery unavailable', {
            code: error instanceof Error && 'code' in error ? String(error.code) : 'unknown',
          });
        }
      },
    },
    socialProviders: {
      google: {
        clientId: googleClientId!,
        clientSecret: googleClientSecret!,
      },
    },
    secondaryStorage: authSecondaryStorage,
    rateLimit: {
      enabled: isProduction,
      storage: authSecondaryStorage ? 'secondary-storage' : 'memory',
      customRules: AUTH_RATE_LIMIT_RULES,
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for'],
      },
    },
    plugins: authPlugins,
  };

  return betterAuth(options);
}

// Lazily initialized auth instance for Cloudflare Workers compatibility
// Environment variables are only available after runtimeEnv middleware runs
let authInstance: ReturnType<typeof betterAuth> | null = null;

export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_target, prop) {
    if (!authInstance) {
      authInstance = createAuthInstance();
    }
    return authInstance[prop as keyof typeof authInstance];
  },
});

// For testing: reset the lazy instance
export function resetAuthInstance(): void {
  authInstance = null;
}
