import { afterEach, describe, expect, it } from 'bun:test';
import { setTestEnv } from '@/lib/env';

afterEach(() => {
  setTestEnv(null);
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
});
