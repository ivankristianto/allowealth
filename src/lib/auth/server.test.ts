import { afterEach, describe, expect, it } from 'bun:test';
import { setTestEnv } from '@/lib/env';
import { getAuthBaseURL, getTrustedOrigins } from './server';

afterEach(() => {
  setTestEnv(null);
});

describe('better-auth server config', () => {
  it('creates an auth instance with google and two-factor enabled', async () => {
    const mod = await import('./server');
    expect(mod.auth).toBeDefined();
  });

  it('uses DEV_HOST as a trusted origin when PUBLIC_URL is unset', () => {
    setTestEnv({
      PUBLIC_URL: undefined,
      DEV_HOST: 'auth.allowealth.local',
      PORT: '4326',
    });

    expect(getAuthBaseURL()).toBe('http://auth.allowealth.local:4326');
    expect(getTrustedOrigins()).toContain('http://auth.allowealth.local:4326');
  });
});
