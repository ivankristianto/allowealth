import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test';
import { emailVerificationService, userMetaService, userService } from '@/services';
import { ServiceErrorCode, UserServiceError } from '@/services/service-errors';

let GET: any;
let PUT: any;

const originalGetById = userService.getById;
const originalUpdateProfile = userService.updateProfile;
const originalGetUserSettings = userMetaService.getUserSettings;
const originalSetUserMeta = userMetaService.setUserMeta;
const originalGetPendingEmailChange = emailVerificationService.getPendingEmailChange;
const originalRequestEmailChange = emailVerificationService.requestEmailChange;

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
    ({ GET, PUT } = await import('@/pages/api/user/profile'));
  });

  afterEach(() => {
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
    userMetaService.getUserSettings = mock(async () => ({ phone: '123', bio: 'Hello' })) as any;
    emailVerificationService.getPendingEmailChange = mock(async () => 'pending@example.com') as any;

    const response = await GET(createApiContext({ method: 'GET' }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.pendingEmail).toBe('pending@example.com');
    expect(payload.data.phone).toBe('123');
    expect(payload.data.bio).toBe('Hello');
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
    userMetaService.getUserSettings = mock(async () => ({ phone: '987', bio: 'Updated' })) as any;
    emailVerificationService.getPendingEmailChange = mock(async () => null) as any;

    const response = await PUT(
      createApiContext({
        method: 'PUT',
        body: {
          name: 'After Name',
          email: 'new@example.com',
          phone: '987',
          bio: 'Updated',
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
    expect(payload.data.message).toBe('Verification email sent to new@example.com');
  });

  it('PUT fails fast on EMAIL_ALREADY_EXISTS and skips profile/meta updates', async () => {
    userService.getById = mock(async () => ({
      id: 'user-1',
      name: 'Before Name',
      email: 'current@example.com',
    })) as any;
    emailVerificationService.requestEmailChange = mock(async () => {
      throw new UserServiceError(
        ServiceErrorCode.EMAIL_ALREADY_EXISTS,
        'Email already exists',
        409
      );
    }) as any;
    userService.updateProfile = mock(async () => ({
      id: 'user-1',
      name: 'After Name',
      email: 'current@example.com',
    })) as any;
    userMetaService.setUserMeta = mock(async () => {}) as any;

    const response = await PUT(
      createApiContext({
        method: 'PUT',
        body: {
          name: 'After Name',
          email: 'taken@example.com',
          phone: '999',
          bio: 'Will not persist',
        },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe(ServiceErrorCode.EMAIL_ALREADY_EXISTS);
    expect(userService.updateProfile).not.toHaveBeenCalled();
    expect(userMetaService.setUserMeta).not.toHaveBeenCalled();
  });
});
