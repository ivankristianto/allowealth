import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import { APIError } from 'better-auth/api';
import { emailVerificationService, userMetaService, userService } from '@/services';
import { clearRateLimitStore } from '@/lib/rate-limit';
import { setTestEnv } from '@/lib/env';

// getEnv reads these overrides before process.env, so they must not reach later files.
afterAll(() => setTestEnv(null));

let GET: any;
let PUT: any;
let authApi: any;
let originalVerifyPassword: unknown;

const originalGetById = userService.getById;
const originalUpdateProfile = userService.updateProfile;
const originalGetUserSettings = userMetaService.getUserSettings;
const originalSetUserMeta = userMetaService.setUserMeta;
const originalGetPendingEmailChange = emailVerificationService.getPendingEmailChange;
const originalRequestEmailChange = emailVerificationService.requestEmailChange;

function hasNormalizedIssue(details: any[], path: string[]) {
  return details.some(
    (issue) =>
      JSON.stringify(issue.path) === JSON.stringify(path) &&
      typeof issue.message === 'string' &&
      typeof issue.code === 'string'
  );
}

function createApiContext(options: {
  method: 'GET' | 'PUT';
  body?: Record<string, unknown>;
  user?: { id: string; workspaceId: string; role: 'admin' | 'member' };
}) {
  return {
    request: new Request('http://localhost/api/user/profile', {
      method: options.method,
      headers: { 'Content-Type': 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined,
    }),
    locals: {
      user: options.user ?? { id: 'user-1', workspaceId: 'workspace-1', role: 'member' },
    },
  } as any;
}

describe('/api/user/profile email change flow', () => {
  beforeAll(async () => {
    setTestEnv({ NODE_ENV: 'test', BETTER_AUTH_SECRET: 'test-secret-for-profile-email-change' });
    ({ GET, PUT } = await import('@/pages/api/user/profile'));
    const authModule = await import('@/lib/auth/server');
    authApi = (authModule.auth as any).api ??= {};
    originalVerifyPassword = authApi.verifyPassword;
  });

  beforeEach(() => {
    clearRateLimitStore();
    authApi.verifyPassword = mock(async ({ body }: { body: { password: string } }) => {
      if (body.password !== 'CorrectPassword123!') {
        throw APIError.from('BAD_REQUEST', {
          code: 'INVALID_PASSWORD',
          message: 'Invalid password',
        });
      }
      return { status: true };
    });
  });

  afterEach(() => {
    authApi.verifyPassword = originalVerifyPassword;
    userService.getById = originalGetById;
    userService.updateProfile = originalUpdateProfile;
    userMetaService.getUserSettings = originalGetUserSettings;
    userMetaService.setUserMeta = originalSetUserMeta;
    emailVerificationService.getPendingEmailChange = originalGetPendingEmailChange;
    emailVerificationService.requestEmailChange = originalRequestEmailChange;
  });

  it('GET includes pendingEmail when one exists', async () => {
    userService.getById = mock(async () => ({
      id: 'user-1',
      name: 'Test User',
      email: 'current@example.com',
    })) as any;
    userMetaService.getUserSettings = mock(async () => ({ phone: '123' })) as any;
    emailVerificationService.getPendingEmailChange = mock(async () => 'pending@example.com') as any;

    const response = await GET(createApiContext({ method: 'GET' }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.pendingEmail).toBe('pending@example.com');
    expect(payload.data.phone).toBe('123');
  });

  it('PUT returns pendingEmail/message when email change is requested', async () => {
    userService.getById = mock(async () => ({
      id: 'user-1',
      name: 'Before Name',
      email: 'current@example.com',
    })) as any;
    emailVerificationService.requestEmailChange = mock(async () => {}) as any;
    userService.updateProfile = mock(async () => ({
      id: 'user-1',
      name: 'After Name',
      email: 'current@example.com',
    })) as any;
    userMetaService.setUserMeta = mock(async () => {}) as any;
    userMetaService.getUserSettings = mock(async () => ({ phone: '987' })) as any;
    emailVerificationService.getPendingEmailChange = mock(async () => null) as any;

    const response = await PUT(
      createApiContext({
        method: 'PUT',
        body: {
          name: 'After Name',
          email: 'new@example.com',
          phone: '987',
          currentPassword: 'CorrectPassword123!',
        },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(emailVerificationService.requestEmailChange).toHaveBeenCalledWith(
      'user-1',
      'new@example.com'
    );
    expect(payload.success).toBe(true);
    expect(payload.data.pendingEmail).toBe('new@example.com');
    expect(payload.data.message).toBe('Check new@example.com for a confirmation link');
  });

  it('PUT returns normalized validation details for invalid profile input', async () => {
    const response = await PUT(
      createApiContext({
        method: 'PUT',
        body: {
          name: '',
          email: 'not-an-email',
          phone: '987',
        },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
    expect(hasNormalizedIssue(payload.error.details, ['name'])).toBe(true);
    expect(hasNormalizedIssue(payload.error.details, ['email'])).toBe(true);
  });

  it('PUT rejects a wrong password before touching the profile', async () => {
    userService.getById = mock(async () => ({
      id: 'user-1',
      name: 'Before Name',
      email: 'current@example.com',
    })) as any;
    emailVerificationService.requestEmailChange = mock(async () => {}) as any;
    userService.updateProfile = mock(async () => ({})) as any;
    userMetaService.setUserMeta = mock(async () => {}) as any;

    const response = await PUT(
      createApiContext({
        method: 'PUT',
        body: {
          name: 'After Name',
          email: 'new@example.com',
          phone: '999',
          currentPassword: 'WrongPassword123!',
        },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe('INVALID_PASSWORD');
    expect(emailVerificationService.requestEmailChange).not.toHaveBeenCalled();
    expect(userService.updateProfile).not.toHaveBeenCalled();
    expect(userMetaService.setUserMeta).not.toHaveBeenCalled();
  });
});
