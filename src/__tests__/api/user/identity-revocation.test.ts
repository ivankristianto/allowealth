import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db, getActiveSchema } from '@/db';
import { setTestEnv } from '@/lib/env';
import { clearRateLimitStore } from '@/lib/rate-limit';
import { USER_META_KEYS } from '@/lib/constants/user-meta-keys';
import { AccountCategoryService } from '@/services/account-category.service';
import { EmailService } from '@/services/email';
import { EmailVerificationService } from '@/services/email-verification.service';

// Stands in for Redis: with secondary storage on, Better Auth reads sessions
// from here first, so a session only dies if this copy is deleted too.
const fakeRedis = new Map<string, string>();
let fakeRedisEnabled = true;

(mock as any).module('@/lib/auth/secondary-storage', () => ({
  createAuthSecondaryStorage: () =>
    fakeRedisEnabled
      ? {
          async get(key: string) {
            return fakeRedis.get(key) ?? null;
          },
          async set(key: string, value: string) {
            fakeRedis.set(key, value);
          },
          async delete(key: string) {
            fakeRedis.delete(key);
          },
          async increment(key: string) {
            const next = Number(fakeRedis.get(key) ?? '0') + 1;
            fakeRedis.set(key, String(next));
            return next;
          },
          async getAndDelete(key: string) {
            const value = fakeRedis.get(key) ?? null;
            fakeRedis.delete(key);
            return value;
          },
        }
      : undefined,
}));

const TEST_ENV = {
  NODE_ENV: 'test',
  BETTER_AUTH_SECRET: 'test-secret-for-identity-revocation-1234567890',
  SIGNUP_MODE: 'public',
};

// Other test files replace '@/lib/auth/server' process-wide; the query string
// loads the real module and the mock below hands it to the routes under test.
const realAuthModule = await import(`@/lib/auth/server?identity=${Date.now()}`);
(mock as any).module('@/lib/auth/server', () => realAuthModule);
const auth = realAuthModule.auth;

const schema = getActiveSchema();

function toCookieHeader(setCookies: string[]): string {
  return setCookies.map((cookie) => cookie.split(';')[0]).join('; ');
}

function headersWithCookie(cookie: string): Headers {
  return new Headers({ cookie, 'content-type': 'application/json' });
}

async function getSessionFor(cookie: string) {
  return auth.api.getSession({ headers: headersWithCookie(cookie) });
}

async function signUp(password: string) {
  const email = `identity-${nanoid(8).toLowerCase()}@example.com`;
  const { headers } = await auth.api.signUpEmail({
    body: { email, password, name: 'Identity Test' },
    returnHeaders: true,
  });
  const cookie = toCookieHeader(headers.getSetCookie());
  const session = await getSessionFor(cookie);
  if (!session) throw new Error('signup did not create a session');

  const domainUser = await db.query.users.findFirst({
    where: eq(schema.users.id, session.user.id),
  });
  if (!domainUser) throw new Error('signup did not create a domain user');

  return { email, cookie, session, domainUser };
}

async function signIn(email: string, password: string) {
  const { headers } = await auth.api.signInEmail({
    body: { email, password },
    returnHeaders: true,
  });
  return toCookieHeader(headers.getSetCookie());
}

function fakeRedisHoldsSession(token: string): boolean {
  return [...fakeRedis.keys()].some((key) => key.includes(token));
}

function createApiContext(options: {
  url: string;
  method: string;
  cookie: string;
  body?: Record<string, unknown>;
  user: { id: string; workspaceId: string; role: 'admin' | 'member' };
  sessionToken: string;
}) {
  const url = new URL(options.url);
  return {
    request: new Request(url, {
      method: options.method,
      headers: headersWithCookie(options.cookie),
      body: options.body ? JSON.stringify(options.body) : undefined,
    }),
    url,
    locals: {
      user: options.user,
      session: { token: options.sessionToken },
    },
  } as any;
}

function domainUserFor(signup: Awaited<ReturnType<typeof signUp>>) {
  return {
    id: signup.domainUser.id,
    workspaceId: signup.domainUser.workspace_id!,
    role: signup.domainUser.role as 'admin' | 'member',
  };
}

const PASSWORD = 'CurrentPassword123!';
const NEW_PASSWORD = 'BrandNewPassword456!';

describe('identity flows revoke sessions through Better Auth', () => {
  beforeAll(() => {
    setTestEnv(TEST_ENV);
    realAuthModule.resetAuthInstance();
  });

  afterAll(() => {
    fakeRedisEnabled = false;
    realAuthModule.resetAuthInstance();
    setTestEnv(null);
  });

  beforeEach(() => {
    setTestEnv(TEST_ENV);
    clearRateLimitStore();
  });

  describe('PUT /api/user/password', () => {
    it('changes the password of a Better Auth user and revokes other sessions', async () => {
      const { PUT } = await import('@/pages/api/user/password');
      const signup = await signUp(PASSWORD);
      expect(signup.domainUser.password_hash).toBeNull();

      const otherDeviceCookie = await signIn(signup.email, PASSWORD);
      const otherDevice = await getSessionFor(otherDeviceCookie);
      expect(otherDevice).not.toBeNull();
      expect(fakeRedisHoldsSession(otherDevice!.session.token)).toBe(true);

      const response = await PUT(
        createApiContext({
          url: 'http://localhost/api/user/password',
          method: 'PUT',
          cookie: signup.cookie,
          body: { oldPassword: PASSWORD, newPassword: NEW_PASSWORD },
          user: domainUserFor(signup),
          sessionToken: signup.session.session.token,
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);

      expect(await getSessionFor(otherDeviceCookie)).toBeNull();
      expect(await getSessionFor(signup.cookie)).toBeNull();
      expect(fakeRedisHoldsSession(otherDevice!.session.token)).toBe(false);

      const currentDeviceCookie = toCookieHeader(response.headers.getSetCookie());
      expect(await getSessionFor(currentDeviceCookie)).not.toBeNull();

      expect(await signIn(signup.email, NEW_PASSWORD)).toContain('session_token');
      await expect(signIn(signup.email, PASSWORD)).rejects.toThrow();

      const domainUser = await db.query.users.findFirst({
        where: eq(schema.users.id, signup.domainUser.id),
      });
      expect(domainUser?.password_hash).toBeNull();
    });

    it('rejects a wrong current password', async () => {
      const { PUT } = await import('@/pages/api/user/password');
      const signup = await signUp(PASSWORD);

      const response = await PUT(
        createApiContext({
          url: 'http://localhost/api/user/password',
          method: 'PUT',
          cookie: signup.cookie,
          body: { oldPassword: 'WrongPassword999!', newPassword: NEW_PASSWORD },
          user: domainUserFor(signup),
          sessionToken: signup.session.session.token,
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.error.code).toBe('INVALID_PASSWORD');
      expect(await getSessionFor(signup.cookie)).not.toBeNull();
    });

    it('rate-limits repeated attempts', async () => {
      const { PUT } = await import('@/pages/api/user/password');
      const signup = await signUp(PASSWORD);
      const statuses: number[] = [];

      for (let attempt = 0; attempt < 6; attempt++) {
        const response = await PUT(
          createApiContext({
            url: 'http://localhost/api/user/password',
            method: 'PUT',
            cookie: signup.cookie,
            body: { oldPassword: 'WrongPassword999!', newPassword: NEW_PASSWORD },
            user: domainUserFor(signup),
            sessionToken: signup.session.session.token,
          })
        );
        statuses.push(response.status);
      }

      expect(statuses.at(-1)).toBe(429);
    });
  });

  describe('GET /api/auth/verify-email (email change)', () => {
    it('revokes every session, including the cached copy', async () => {
      const { GET } = await import('@/pages/api/auth/verify-email');
      const signup = await signUp(PASSWORD);
      const session = signup.session.session;
      expect(fakeRedisHoldsSession(session.token)).toBe(true);

      const verification = new EmailVerificationService(db);
      await verification.requestEmailChange(
        signup.domainUser.id,
        `changed-${nanoid(8).toLowerCase()}@example.com`
      );
      const token = await verification.createVerificationToken(signup.domainUser.id);

      const response = await GET({
        request: new Request(`http://localhost/api/auth/verify-email?token=${token}`),
        redirect: (location: string, status: number) =>
          new Response(null, { status, headers: { location } }),
      } as any);

      expect(response.headers.get('location')).toBe('/login?email-changed=true');
      expect(fakeRedisHoldsSession(session.token)).toBe(false);
      expect(await getSessionFor(signup.cookie)).toBeNull();
    });
  });

  describe('POST /api/auth/reset-password', () => {
    const originalSendPasswordReset = EmailService.prototype.sendPasswordReset;

    afterAll(() => {
      EmailService.prototype.sendPasswordReset = originalSendPasswordReset;
    });

    it('revokes every session, including the cached copy', async () => {
      const signup = await signUp(PASSWORD);
      const otherDeviceCookie = await signIn(signup.email, PASSWORD);
      const otherDevice = await getSessionFor(otherDeviceCookie);
      expect(fakeRedisHoldsSession(signup.session.session.token)).toBe(true);
      expect(fakeRedisHoldsSession(otherDevice!.session.token)).toBe(true);

      let resetUrl = '';
      EmailService.prototype.sendPasswordReset = mock(async (options: { resetUrl: string }) => {
        resetUrl = options.resetUrl;
        return { success: true };
      }) as unknown as typeof originalSendPasswordReset;

      await auth.api.requestPasswordReset({
        body: { email: signup.email, redirectTo: '/reset-password' },
      });
      const token = new URL(resetUrl).pathname.split('/').pop();
      expect(token).toBeTruthy();

      await auth.api.resetPassword({ body: { token, newPassword: NEW_PASSWORD } });

      expect(fakeRedisHoldsSession(signup.session.session.token)).toBe(false);
      expect(fakeRedisHoldsSession(otherDevice!.session.token)).toBe(false);
      expect(await getSessionFor(signup.cookie)).toBeNull();
      expect(await getSessionFor(otherDeviceCookie)).toBeNull();

      const remaining = await db
        .select({ id: schema.session.id })
        .from(schema.session)
        .where(eq(schema.session.userId, signup.session.user.id));
      expect(remaining).toHaveLength(0);
    });
  });

  describe('failed signup bootstrap', () => {
    const originalSeed = AccountCategoryService.prototype.seedDefaultCategories;

    afterAll(() => {
      AccountCategoryService.prototype.seedDefaultCategories = originalSeed;
    });

    it('clears sessions through the Better Auth adapter of the signup request', async () => {
      AccountCategoryService.prototype.seedDefaultCategories = mock(async () => {
        throw new Error('category seeding failed');
      });
      const { internalAdapter } = await auth.$context;
      const deleteUserSessions = internalAdapter.deleteUserSessions;
      const deletedFor: string[] = [];
      internalAdapter.deleteUserSessions = async (userId: string) => {
        deletedFor.push(userId);
        return deleteUserSessions(userId);
      };

      const email = `bootstrap-${nanoid(8).toLowerCase()}@example.com`;
      try {
        await expect(
          auth.api.signUpEmail({ body: { email, password: PASSWORD, name: 'Bootstrap Test' } })
        ).rejects.toThrow();
      } finally {
        internalAdapter.deleteUserSessions = deleteUserSessions;
        AccountCategoryService.prototype.seedDefaultCategories = originalSeed;
      }

      expect(deletedFor).toHaveLength(1);
      const leftover = await db
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.email, email));
      expect(leftover).toHaveLength(0);
    });
  });

  describe('PUT /api/user/profile (email change)', () => {
    async function putProfile(
      signup: Awaited<ReturnType<typeof signUp>>,
      body: Record<string, unknown>
    ) {
      const { PUT } = await import('@/pages/api/user/profile');
      const response = await PUT(
        createApiContext({
          url: 'http://localhost/api/user/profile',
          method: 'PUT',
          cookie: signup.cookie,
          body: { name: 'Identity Test', phone: '', ...body },
          user: domainUserFor(signup),
          sessionToken: signup.session.session.token,
        })
      );
      return { response, payload: await response.json() };
    }

    async function pendingEmailOf(userId: string) {
      const meta = await db.query.userMeta.findFirst({
        where: (table, { and: andOp, eq: eqOp }) =>
          andOp(eqOp(table.user_id, userId), eqOp(table.meta_key, USER_META_KEYS.PENDING_EMAIL)),
      });
      return meta?.meta_value ?? null;
    }

    let sendVerification: ReturnType<typeof mock>;
    let sendNotice: ReturnType<typeof mock>;
    let originalVerification: unknown;
    let originalNotice: unknown;

    beforeEach(async () => {
      const { emailService } = await import('@/services');
      const service = emailService as any;
      originalVerification = service.sendEmailChangeVerification;
      originalNotice = service.sendEmailChangeNotice;
      sendVerification = mock(async () => ({ success: true }));
      sendNotice = mock(async () => ({ success: true }));
      service.sendEmailChangeVerification = sendVerification;
      service.sendEmailChangeNotice = sendNotice;
    });

    afterAll(async () => {
      const { emailService } = await import('@/services');
      const service = emailService as any;
      service.sendEmailChangeVerification = originalVerification;
      service.sendEmailChangeNotice = originalNotice;
    });

    it('rejects an email change without the current password', async () => {
      const signup = await signUp(PASSWORD);
      const newEmail = `new-${nanoid(8).toLowerCase()}@example.com`;

      const { response, payload } = await putProfile(signup, { email: newEmail });

      expect(response.status).toBe(400);
      expect(payload.error.code).toBe('CURRENT_PASSWORD_REQUIRED');
      expect(await pendingEmailOf(signup.domainUser.id)).toBeNull();
      expect(sendVerification).not.toHaveBeenCalled();
    });

    it('rejects an email change with a wrong current password', async () => {
      const signup = await signUp(PASSWORD);
      const newEmail = `new-${nanoid(8).toLowerCase()}@example.com`;

      const { response, payload } = await putProfile(signup, {
        email: newEmail,
        currentPassword: 'WrongPassword999!',
      });

      expect(response.status).toBe(400);
      expect(payload.error.code).toBe('INVALID_PASSWORD');
      expect(await pendingEmailOf(signup.domainUser.id)).toBeNull();
      expect(sendVerification).not.toHaveBeenCalled();
    });

    it('sends the verification link and notifies the old address with the right password', async () => {
      const signup = await signUp(PASSWORD);
      const newEmail = `new-${nanoid(8).toLowerCase()}@example.com`;

      const { response, payload } = await putProfile(signup, {
        email: newEmail,
        currentPassword: PASSWORD,
      });

      expect(response.status).toBe(200);
      expect(payload.data.pendingEmail).toBe(newEmail);
      expect(sendVerification).toHaveBeenCalledTimes(1);
      expect((sendVerification as any).mock.calls[0][0]).toMatchObject({ to: newEmail });
      expect(sendNotice).toHaveBeenCalledTimes(1);
      expect((sendNotice as any).mock.calls[0][0]).toMatchObject({ to: signup.email });
    });

    it('answers the same way for an address another account owns, without mailing it', async () => {
      const owner = await signUp(PASSWORD);
      const requester = await signUp(PASSWORD);

      const { response, payload } = await putProfile(requester, {
        email: owner.email,
        currentPassword: PASSWORD,
      });

      expect(response.status).toBe(200);
      expect(payload.data.pendingEmail).toBe(owner.email);
      expect(sendVerification).not.toHaveBeenCalled();
      expect(sendNotice).toHaveBeenCalledTimes(1);
      expect((sendNotice as any).mock.calls[0][0]).toMatchObject({ to: requester.email });
    });

    it('lets a name change through without the password', async () => {
      const signup = await signUp(PASSWORD);

      const { response } = await putProfile(signup, {
        email: signup.email,
        name: 'Renamed User',
      });

      expect(response.status).toBe(200);
    });

    it('rate-limits repeated email change attempts', async () => {
      const signup = await signUp(PASSWORD);
      const statuses: number[] = [];

      for (let attempt = 0; attempt < 6; attempt++) {
        const { response } = await putProfile(signup, {
          email: `new-${attempt}-${nanoid(6).toLowerCase()}@example.com`,
          currentPassword: 'WrongPassword999!',
        });
        statuses.push(response.status);
      }

      expect(statuses.at(-1)).toBe(429);
    });
  });
});
