import { afterEach, beforeAll, describe, expect, mock, test } from 'bun:test';
import { setTestEnv } from '@/lib/env';
import { WorkspaceInvitationServiceError, ServiceErrorCode } from '@/services/service-errors';

const registerMock = mock(async () => ({
  id: 'user-public',
  email: 'public@example.com',
  name: 'Public User',
}));

const registerWithInvitationMock = mock(async () => ({
  id: 'user-invited',
  email: 'invitee@example.com',
  name: 'Invited User',
}));

const validateAndGetMock = mock(async () => ({
  workspace_id: 'workspace-1',
  email: 'invitee@example.com',
  role: 'member',
}));

const acceptInvitationMock = mock(async () => {});
const sendVerificationEmailMock = mock(async () => {});
const seedDefaultCategoriesMock = mock(async () => {});
const verifyTurnstileTokenMock = mock(async () => ({ success: true }));
const checkRateLimitMock = mock(() => ({
  allowed: true,
  limit: 5,
  remaining: 4,
  reset: Date.now(),
}));

(mock as any).module('@/services/auth.service', () => ({
  register: registerMock,
  registerWithInvitation: registerWithInvitationMock,
  AUTH_ERRORS: {
    USER_EXISTS: 'USER_EXISTS',
    INVALID_INPUT: 'INVALID_INPUT',
  },
}));

(mock as any).module('@/services', () => ({
  workspaceInvitationService: {
    validateAndGet: validateAndGetMock,
    accept: acceptInvitationMock,
  },
  emailVerificationService: {
    sendVerificationEmail: sendVerificationEmailMock,
  },
  accountCategoryService: {
    seedDefaultCategories: seedDefaultCategoriesMock,
  },
}));

(mock as any).module('@/lib/turnstile', () => ({
  verifyTurnstileToken: verifyTurnstileTokenMock,
}));

(mock as any).module('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  createRateLimitResponse: () => new Response('rate-limited', { status: 429 }),
  applyRateLimitHeaders: (response: Response) => response,
  RATE_LIMIT_PRESETS: {
    signup: { message: 'Too many signup attempts' },
  },
}));

function resetDefaultImplementations(): void {
  registerMock.mockImplementation(async () => ({
    id: 'user-public',
    email: 'public@example.com',
    name: 'Public User',
  }));
  registerWithInvitationMock.mockImplementation(async () => ({
    id: 'user-invited',
    email: 'invitee@example.com',
    name: 'Invited User',
  }));
  validateAndGetMock.mockImplementation(async () => ({
    workspace_id: 'workspace-1',
    email: 'invitee@example.com',
    role: 'member',
  }));
  acceptInvitationMock.mockImplementation(async () => {});
  sendVerificationEmailMock.mockImplementation(async () => {});
  seedDefaultCategoriesMock.mockImplementation(async () => {});
  verifyTurnstileTokenMock.mockImplementation(async () => ({ success: true }));
  checkRateLimitMock.mockImplementation(() => ({
    allowed: true,
    limit: 5,
    remaining: 4,
    reset: Date.now(),
  }));
}

resetDefaultImplementations();

let POST: any;

function createApiContext(params: {
  token?: string;
  body?: Record<string, unknown>;
  clientAddress?: string;
}) {
  const url = new URL('http://localhost/api/auth/signup');
  if (params.token) {
    url.searchParams.set('token', params.token);
  }

  return {
    request: new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        params.body ?? {
          email: 'invitee@example.com',
          password: 'StrongPassword123!',
          name: 'Test User',
          turnstileToken: 'turnstile-token',
        }
      ),
    }),
    clientAddress: params.clientAddress ?? '127.0.0.1',
    url,
  } as any;
}

describe('POST /api/auth/signup - Turnstile and invitation mode behavior', () => {
  beforeAll(async () => {
    ({ POST } = await import('@/pages/api/auth/signup'));
  });

  afterEach(() => {
    setTestEnv(null);
    resetDefaultImplementations();
    registerMock.mockClear();
    registerWithInvitationMock.mockClear();
    validateAndGetMock.mockClear();
    acceptInvitationMock.mockClear();
    sendVerificationEmailMock.mockClear();
    seedDefaultCategoriesMock.mockClear();
    verifyTurnstileTokenMock.mockClear();
    checkRateLimitMock.mockClear();
  });

  test('verifies turnstile before checking rate limit', async () => {
    const executionOrder: string[] = [];
    verifyTurnstileTokenMock.mockImplementation(async () => {
      executionOrder.push('turnstile');
      return { success: true };
    });
    checkRateLimitMock.mockImplementation(() => {
      executionOrder.push('rate-limit');
      return { allowed: true, limit: 5, remaining: 4, reset: Date.now() };
    });

    setTestEnv({ SIGNUP_MODE: 'public' });

    const response = await POST(createApiContext({}));

    expect(response.status).toBe(201);
    expect(executionOrder).toEqual(['turnstile', 'rate-limit']);
  });

  test('returns 400 when token is missing in invite_only mode', async () => {
    setTestEnv({ SIGNUP_MODE: 'invite_only' });

    const response = await POST(createApiContext({}));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.error.message).toBe('Invitation token is required for signup');
    expect(registerMock).not.toHaveBeenCalled();
    expect(registerWithInvitationMock).not.toHaveBeenCalled();
  });

  test('creates account with invitation token in invite_only mode', async () => {
    setTestEnv({ SIGNUP_MODE: 'invite_only' });

    const response = await POST(createApiContext({ token: 'valid-token' }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(payload.data.user.id).toBe('user-invited');
    expect(payload.data.user.email).toBe('invitee@example.com');
    expect(registerWithInvitationMock).toHaveBeenCalledTimes(1);
    expect(acceptInvitationMock).toHaveBeenCalledWith('valid-token');
    expect(registerMock).not.toHaveBeenCalled();
  });

  test('skips verification email for invitation-based signup', async () => {
    setTestEnv({ SIGNUP_MODE: 'invite_only' });

    await POST(createApiContext({ token: 'valid-token' }));

    expect(sendVerificationEmailMock).not.toHaveBeenCalled();
  });

  test('sends verification email for public signup', async () => {
    setTestEnv({ SIGNUP_MODE: 'public' });

    await POST(
      createApiContext({
        body: {
          email: 'public@example.com',
          password: 'StrongPassword123!',
          name: 'Public User',
          turnstileToken: 'turnstile-token',
        },
      })
    );

    expect(sendVerificationEmailMock).toHaveBeenCalledWith('user-public', 'http://localhost');
  });

  test('seeds default categories for invited admin users', async () => {
    setTestEnv({ SIGNUP_MODE: 'invite_only' });
    validateAndGetMock.mockImplementation(async () => ({
      workspace_id: 'workspace-1',
      email: 'invitee@example.com',
      role: 'admin',
    }));

    await POST(createApiContext({ token: 'valid-token' }));

    expect(seedDefaultCategoriesMock).toHaveBeenCalledWith('workspace-1', 'user-invited');
  });

  test('does not seed categories for invited member users', async () => {
    setTestEnv({ SIGNUP_MODE: 'invite_only' });

    await POST(createApiContext({ token: 'valid-token' }));

    expect(seedDefaultCategoriesMock).not.toHaveBeenCalled();
  });

  test('allows public signup without invitation token in public mode', async () => {
    setTestEnv({ SIGNUP_MODE: 'public' });

    const response = await POST(
      createApiContext({
        body: {
          email: 'public@example.com',
          password: 'StrongPassword123!',
          name: 'Public User',
          turnstileToken: 'turnstile-token',
        },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(payload.data.user.email).toBe('public@example.com');
    expect(registerMock).toHaveBeenCalledTimes(1);
    expect(registerWithInvitationMock).not.toHaveBeenCalled();
  });

  test('returns 400 for expired invitation token', async () => {
    setTestEnv({ SIGNUP_MODE: 'invite_only' });
    validateAndGetMock.mockImplementation(async () => {
      throw new WorkspaceInvitationServiceError(
        ServiceErrorCode.INVITATION_EXPIRED,
        'Invitation has expired',
        400
      );
    });

    const response = await POST(createApiContext({ token: 'expired-token' }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.error.message).toBe('Invitation has expired');
    expect(registerWithInvitationMock).not.toHaveBeenCalled();
  });
});
