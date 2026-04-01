import { beforeEach, describe, expect, it } from 'bun:test';

import { setTestEnv } from '@/lib/env';

describe('POST /api/auth/e2e-reset-rate-limits', () => {
  beforeEach(() => {
    setTestEnv({ NODE_ENV: 'development' });
  });

  it('allows localhost and local-style hosts in development', async () => {
    const route = await import('@/pages/api/auth/e2e-reset-rate-limits');

    for (const url of [
      'http://localhost/api/auth/e2e-reset-rate-limits',
      'http://127.0.0.1/api/auth/e2e-reset-rate-limits',
      'http://[::1]/api/auth/e2e-reset-rate-limits',
      'http://allowealth.local/api/auth/e2e-reset-rate-limits',
    ]) {
      const response = await route.POST({
        request: new Request(url, { method: 'POST' }),
      } as any);

      expect(response.status).toBe(200);
    }
  });

  it('returns 403 for non-local hosts in development', async () => {
    const route = await import('@/pages/api/auth/e2e-reset-rate-limits');
    const response = await route.POST({
      request: new Request('http://example.com/api/auth/e2e-reset-rate-limits', {
        method: 'POST',
      }),
    } as any);

    expect(response.status).toBe(403);
  });

  it('returns 404 outside development', async () => {
    setTestEnv({ NODE_ENV: 'test' });
    const route = await import('@/pages/api/auth/e2e-reset-rate-limits');
    const response = await route.POST({
      request: new Request('http://localhost/api/auth/e2e-reset-rate-limits', {
        method: 'POST',
      }),
    } as any);

    expect(response.status).toBe(404);
  });
});
