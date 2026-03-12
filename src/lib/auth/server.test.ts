import { afterEach, describe, expect, it } from 'bun:test';
import { resetCacheManager } from '@/lib/cache';
import { setTestEnv } from '@/lib/env';

afterEach(() => {
  setTestEnv(null);
  resetCacheManager();
});

async function importFreshServer() {
  return import(`./server?test=${Date.now()}-${Math.random()}`);
}

describe('better-auth server config', () => {
  it('creates an auth instance with google and two-factor enabled', async () => {
    setTestEnv({
      NODE_ENV: 'test',
      BETTER_AUTH_SECRET: 'test-better-auth-secret',
      GOOGLE_CLIENT_ID: 'test-google-client-id',
      GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
    });

    const mod = await importFreshServer();
    expect(mod.auth).toBeDefined();
  });

  it('enables the captcha plugin when TURNSTILE_SECRET_KEY is configured', async () => {
    setTestEnv({
      NODE_ENV: 'test',
      BETTER_AUTH_SECRET: 'test-better-auth-secret-1234567890',
      GOOGLE_CLIENT_ID: 'test-google-client-id',
      GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
      PUBLIC_TURNSTILE_SITE_KEY: 'turnstile-site-key',
      TURNSTILE_SECRET_KEY: 'turnstile-secret',
    });

    const mod = await importFreshServer();
    const pluginIds = mod.auth.options.plugins.map((plugin: { id: string }) => plugin.id);

    expect(pluginIds).toContain('captcha');
    expect(pluginIds).toContain('two-factor');
  });

  it('does not enable the captcha plugin when TURNSTILE_SECRET_KEY is unset', async () => {
    setTestEnv({
      NODE_ENV: 'test',
      BETTER_AUTH_SECRET: 'test-better-auth-secret-1234567890',
      GOOGLE_CLIENT_ID: 'test-google-client-id',
      GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
      TURNSTILE_SECRET_KEY: undefined,
    });

    const mod = await importFreshServer();
    const pluginIds = mod.auth.options.plugins.map((plugin: { id: string }) => plugin.id);

    expect(pluginIds).not.toContain('captcha');
    expect(pluginIds).toContain('two-factor');
  });

  it('does not enable the captcha plugin when PUBLIC_TURNSTILE_SITE_KEY is unset', async () => {
    setTestEnv({
      NODE_ENV: 'test',
      BETTER_AUTH_SECRET: 'test-better-auth-secret-1234567890',
      GOOGLE_CLIENT_ID: 'test-google-client-id',
      GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
      PUBLIC_TURNSTILE_SITE_KEY: undefined,
      TURNSTILE_SECRET_KEY: 'turnstile-secret',
    });

    const mod = await importFreshServer();
    const pluginIds = mod.auth.options.plugins.map((plugin: { id: string }) => plugin.id);

    expect(pluginIds).not.toContain('captcha');
    expect(pluginIds).toContain('two-factor');
  });

  it('uses DEV_HOST as a trusted origin when PUBLIC_URL is unset', () => {
    setTestEnv({
      NODE_ENV: 'test',
      BETTER_AUTH_SECRET: 'test-better-auth-secret',
      GOOGLE_CLIENT_ID: 'test-google-client-id',
      GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
      PUBLIC_URL: undefined,
      DEV_HOST: 'auth.allowealth.local',
      PORT: '4326',
    });

    return importFreshServer().then((mod) => {
      expect(mod.getAuthBaseURL()).toBe('http://auth.allowealth.local:4326');
      expect(mod.getTrustedOrigins()).toContain('http://auth.allowealth.local:4326');
    });
  });

  it('fails to initialize outside tests when BETTER_AUTH_SECRET is missing', async () => {
    setTestEnv({
      NODE_ENV: 'production',
      BETTER_AUTH_SECRET: undefined,
      GOOGLE_CLIENT_ID: 'prod-google-client-id',
      GOOGLE_CLIENT_SECRET: 'prod-google-client-secret',
    });

    await expect(importFreshServer()).rejects.toThrow('BETTER_AUTH_SECRET must be set');
  });

  it('fails to initialize in production when Turnstile config is missing', async () => {
    setTestEnv({
      NODE_ENV: 'production',
      BETTER_AUTH_SECRET: 'prod-better-auth-secret',
      GOOGLE_CLIENT_ID: 'prod-google-client-id',
      GOOGLE_CLIENT_SECRET: 'prod-google-client-secret',
      PUBLIC_TURNSTILE_SITE_KEY: undefined,
      TURNSTILE_SECRET_KEY: undefined,
    });

    await expect(importFreshServer()).rejects.toThrow(
      'PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY must be set in production'
    );
  });

  it('fails to initialize in production when Turnstile config is incomplete', async () => {
    setTestEnv({
      NODE_ENV: 'production',
      BETTER_AUTH_SECRET: 'prod-better-auth-secret',
      GOOGLE_CLIENT_ID: 'prod-google-client-id',
      GOOGLE_CLIENT_SECRET: 'prod-google-client-secret',
      PUBLIC_TURNSTILE_SITE_KEY: 'turnstile-site-key',
      TURNSTILE_SECRET_KEY: undefined,
    });

    await expect(importFreshServer()).rejects.toThrow(
      'PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY must be set in production'
    );
  });

  it('configures explicit Better Auth rate limits and IP headers', async () => {
    setTestEnv({
      NODE_ENV: 'test',
      BETTER_AUTH_SECRET: 'test-better-auth-secret-1234567890',
      GOOGLE_CLIENT_ID: 'test-google-client-id',
      GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
      PUBLIC_TURNSTILE_SITE_KEY: 'turnstile-site-key',
      TURNSTILE_SECRET_KEY: 'turnstile-secret',
    });

    const mod = await importFreshServer();

    expect(mod.auth.options.rateLimit?.customRules?.['/sign-in/email']).toEqual({
      window: 15 * 60,
      max: 10,
    });
    expect(mod.auth.options.rateLimit?.customRules?.['/sign-up/email']).toEqual({
      window: 60 * 60,
      max: 5,
    });
    expect(mod.auth.options.rateLimit?.customRules?.['/request-password-reset']).toEqual({
      window: 60 * 60,
      max: 3,
    });
    expect(mod.auth.options.rateLimit?.customRules?.['/sign-in/social']).toEqual({
      window: 15 * 60,
      max: 10,
    });
    expect(mod.auth.options.advanced?.ipAddress?.ipAddressHeaders).toEqual([
      'cf-connecting-ip',
      'x-forwarded-for',
    ]);
  });

  it('enables Better Auth secondary storage when Upstash cache is configured', async () => {
    setTestEnv({
      NODE_ENV: 'production',
      BETTER_AUTH_SECRET: 'prod-better-auth-secret-1234567890',
      GOOGLE_CLIENT_ID: 'prod-google-client-id',
      GOOGLE_CLIENT_SECRET: 'prod-google-client-secret',
      PUBLIC_TURNSTILE_SITE_KEY: 'turnstile-site-key',
      TURNSTILE_SECRET_KEY: 'turnstile-secret',
      CACHE_DRIVER: 'upstash',
      UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'upstash-token',
    });

    const mod = await importFreshServer();

    expect(mod.auth.options.secondaryStorage).toBeDefined();
    expect(mod.auth.options.rateLimit?.storage).toBe('secondary-storage');
  });

  it('does not throw from password reset delivery callback when email is unavailable', async () => {
    setTestEnv({
      NODE_ENV: 'production',
      BETTER_AUTH_SECRET: 'prod-better-auth-secret-1234567890',
      GOOGLE_CLIENT_ID: 'prod-google-client-id',
      GOOGLE_CLIENT_SECRET: 'prod-google-client-secret',
      PUBLIC_TURNSTILE_SITE_KEY: 'turnstile-site-key',
      TURNSTILE_SECRET_KEY: 'turnstile-secret',
      EMAIL_MODE: 'real',
      EMAIL_PROVIDER: '',
      EMAIL_API_KEY: '',
      EMAIL_SENDER_ADDRESS: '',
    });

    const mod = await importFreshServer();

    await expect(
      mod.auth.options.emailAndPassword?.sendResetPassword?.({
        user: { email: 'user@example.com' },
        url: 'https://example.com/reset?token=abc',
      })
    ).resolves.toBeUndefined();
  });
});
