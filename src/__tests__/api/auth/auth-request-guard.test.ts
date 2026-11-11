import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { mockModuleForFile } from '@/lib/test-helpers/mock-module';
import * as realAuthServer from '@/lib/auth/server';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db, users, workspaces } from '@/db';
import { setTestEnv } from '@/lib/env';
import { clearRateLimitStore } from '@/lib/rate-limit';

const TEST_ENV = {
  NODE_ENV: 'test',
  BETTER_AUTH_SECRET: 'test-secret-for-auth-request-guard-1234567890',
  SIGNUP_MODE: 'public',
  CACHE_DRIVER: 'memory',
  DEMO_MODE: 'false',
};

// Other test files replace '@/lib/auth/server' process-wide; the query string
// loads the real module and the mock hands it to the routes under test.
const realAuthModule = await import(`@/lib/auth/server?guard=${Date.now()}`);
mockModuleForFile('@/lib/auth/server', realAuthServer, () => realAuthModule);
const auth = realAuthModule.auth;

const PASSWORD = 'CurrentPassword123!';

function toCookieHeader(setCookies: string[]): string {
  return setCookies.map((cookie) => cookie.split(';')[0]).join('; ');
}

async function signUp() {
  const email = `guard-${nanoid(8).toLowerCase()}@example.com`;
  const { headers } = await auth.api.signUpEmail({
    body: { email, password: PASSWORD, name: 'Guard Test' },
    returnHeaders: true,
  });
  const cookie = toCookieHeader(headers.getSetCookie());
  const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
  if (!session) throw new Error('signup did not create a session');
  const domainUser = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
  if (!domainUser?.workspace_id) throw new Error('signup did not create a workspace member');
  return { cookie, userId: session.user.id, workspaceId: domainUser.workspace_id };
}

/** Sends a real HTTP request through Better Auth's handler, as the catch-all route does. */
async function callAuth(path: string, cookie: string, body?: Record<string, unknown>) {
  const baseURL = realAuthModule.getAuthBaseURL();
  return auth.handler(
    new Request(`${baseURL}/api/auth${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { cookie, origin: baseURL, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
  );
}

const SENSITIVE_CALLS: Array<[string, string, Record<string, unknown> | undefined]> = [
  [
    'change the password',
    '/change-password',
    { currentPassword: PASSWORD, newPassword: 'BrandNewPassword456!' },
  ],
  ['add a passkey', '/passkey/generate-register-options', undefined],
  ['enable 2FA', '/two-factor/enable', { password: PASSWORD }],
];

describe('Better Auth request guard', () => {
  beforeAll(() => {
    setTestEnv(TEST_ENV);
    realAuthModule.resetAuthInstance();
  });

  afterAll(() => {
    realAuthModule.resetAuthInstance();
    setTestEnv(null);
  });

  beforeEach(() => {
    setTestEnv(TEST_ENV);
    clearRateLimitStore();
  });

  describe('soft-deleted users', () => {
    for (const [label, path, body] of SENSITIVE_CALLS) {
      it(`cannot ${label} with a session from before the deletion`, async () => {
        const account = await signUp();
        await db.update(users).set({ deleted_at: new Date() }).where(eq(users.id, account.userId));

        const response = await callAuth(path, account.cookie, body);

        expect(response.status).toBe(403);
        expect((await response.json()).code).toBe('ACCOUNT_DEACTIVATED');
      });
    }

    it('can still sign out', async () => {
      const account = await signUp();
      await db.update(users).set({ deleted_at: new Date() }).where(eq(users.id, account.userId));

      const response = await callAuth('/sign-out', account.cookie, {});

      expect(response.status).toBe(200);
    });

    it('leaves active users alone', async () => {
      const account = await signUp();

      const response = await callAuth('/passkey/generate-register-options', account.cookie);

      expect(response.status).toBe(200);
    });
  });

  it('refuses members of an archived workspace', async () => {
    const account = await signUp();
    await db
      .update(workspaces)
      .set({ status: 'inactive' })
      .where(eq(workspaces.id, account.workspaceId));

    const response = await callAuth('/two-factor/enable', account.cookie, { password: PASSWORD });

    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe('WORKSPACE_INACTIVE');
  });

  describe('demo mode', () => {
    beforeEach(() => {
      setTestEnv({ ...TEST_ENV, DEMO_MODE: 'true' });
    });

    it('refuses a password change', async () => {
      const account = await signUp();

      const response = await callAuth('/change-password', account.cookie, {
        currentPassword: PASSWORD,
        newPassword: 'BrandNewPassword456!',
      });

      expect(response.status).toBe(403);
      expect((await response.json()).code).toBe('DEMO_MODE');
    });

    it('refuses enabling 2FA', async () => {
      const account = await signUp();

      const response = await callAuth('/two-factor/enable', account.cookie, {
        password: PASSWORD,
      });

      expect(response.status).toBe(403);
      expect((await response.json()).code).toBe('DEMO_MODE');
    });

    it('refuses the app password-change route with 403', async () => {
      const account = await signUp();
      const { PUT } = await import('@/pages/api/user/password');
      const url = new URL('http://localhost/api/user/password');

      const response = await PUT({
        request: new Request(url, {
          method: 'PUT',
          headers: { cookie: account.cookie, 'content-type': 'application/json' },
          body: JSON.stringify({ oldPassword: PASSWORD, newPassword: 'BrandNewPassword456!' }),
        }),
        url,
        locals: { user: { id: account.userId, workspaceId: account.workspaceId, role: 'admin' } },
      } as any);

      expect(response.status).toBe(403);
    });

    it('still lets demo visitors sign out', async () => {
      const account = await signUp();

      const response = await callAuth('/sign-out', account.cookie, {});

      expect(response.status).toBe(200);
    });
  });
});
