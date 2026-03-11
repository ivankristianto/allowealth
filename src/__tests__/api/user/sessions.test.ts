import { beforeAll, describe, expect, it, mock } from 'bun:test';
import { setTestEnv } from '@/lib/env';

// Set env before auth module loads
setTestEnv({
  NODE_ENV: 'test',
  BETTER_AUTH_SECRET: 'test-secret-for-sessions-test',
});

let GET: any;
let DELETE: any;
let POST: any;
let authApi: any;

function createApiContext(options: {
  method?: string;
  body?: Record<string, unknown>;
  user?: { id: string; workspaceId: string; role: 'admin' | 'member' } | null;
  session?: { token: string } | null;
  url?: string;
}) {
  const method = options.method ?? 'GET';
  const urlStr = options.url ?? 'http://localhost/api/user/sessions';

  return {
    request: new Request(urlStr, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined,
    }),
    url: new URL(urlStr),
    locals: {
      user:
        options.user !== undefined
          ? options.user
          : { id: 'user-1', workspaceId: 'ws-1', role: 'member' },
      session: options.session !== undefined ? options.session : { token: 'current-tok' },
    },
  } as any;
}

const fakeSessions = [
  {
    id: 'sess-1',
    token: 'tok-1',
    userId: 'user-1',
    ipAddress: '1.2.3.4',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120',
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-01'),
    expiresAt: new Date('2026-04-01'),
  },
  {
    id: 'sess-2',
    token: 'current-tok',
    userId: 'user-1',
    ipAddress: '5.6.7.8',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0) Firefox/121',
    createdAt: new Date('2026-03-05'),
    updatedAt: new Date('2026-03-05'),
    expiresAt: new Date('2026-04-05'),
  },
];

describe('API /api/user/sessions', () => {
  beforeAll(async () => {
    const authModule = await import('@/lib/auth/server');
    authApi = authModule.auth.api;

    // Stub Better Auth API methods
    (authApi as any).listSessions = mock(() => Promise.resolve([]));
    (authApi as any).revokeSession = mock(() => Promise.resolve({ status: true }));
    (authApi as any).revokeOtherSessions = mock(() => Promise.resolve({ status: true }));

    ({ GET, DELETE, POST } = await import('@/pages/api/user/sessions'));
  });

  describe('GET', () => {
    it('returns 401 when unauthenticated', async () => {
      const response = await GET(createApiContext({ user: null }));
      expect(response.status).toBe(401);
    });

    it('returns normalized sessions for authenticated user', async () => {
      (authApi as any).listSessions = mock(() => Promise.resolve(fakeSessions));

      const response = await GET(createApiContext({}));
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.data.sessions).toHaveLength(2);
      // Current session should be first
      expect(payload.data.sessions[0].isCurrent).toBe(true);
      expect(payload.data.sessions[0].token).toBe('current-tok');
    });
  });

  describe('DELETE', () => {
    it('returns 401 when unauthenticated', async () => {
      const response = await DELETE(createApiContext({ method: 'DELETE', user: null }));
      expect(response.status).toBe(401);
    });

    it('returns 400 when trying to revoke current session', async () => {
      const response = await DELETE(
        createApiContext({
          method: 'DELETE',
          body: { token: 'current-tok' },
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.success).toBe(false);
    });

    it('revokes a non-current session', async () => {
      (authApi as any).revokeSession = mock(() => Promise.resolve({ status: true }));

      const response = await DELETE(
        createApiContext({
          method: 'DELETE',
          body: { token: 'other-tok' },
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
    });
  });

  describe('POST (revoke all others)', () => {
    it('returns 401 when unauthenticated', async () => {
      const response = await POST(createApiContext({ method: 'POST', user: null }));
      expect(response.status).toBe(401);
    });

    it('revokes all other sessions', async () => {
      (authApi as any).revokeOtherSessions = mock(() => Promise.resolve({ status: true }));

      const response = await POST(createApiContext({ method: 'POST' }));
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
    });
  });
});
