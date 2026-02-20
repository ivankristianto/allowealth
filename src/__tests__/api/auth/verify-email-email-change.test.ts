import { afterEach, beforeAll, describe, expect, mock, test } from 'bun:test';

const verifyEmailMock = mock(async () => ({
  success: true,
  emailChanged: true,
  user: {
    id: 'user-1',
    workspace_id: 'workspace-1',
    role: 'member',
  },
}));
const activateWorkspaceMock = mock(async () => {});
const seedDefaultCategoriesMock = mock(async () => {});
const invalidateDbSessionsMock = mock(async () => {});
const invalidateSessionCacheMock = mock(async () => {});

(mock as any).module('@/services/email-verification.service', () => ({
  EmailVerificationService: class {
    async verifyEmail(token: string) {
      return verifyEmailMock(token);
    }
  },
}));

(mock as any).module('@/services/workspace.service', () => ({
  WorkspaceService: class {
    async activateWorkspace(workspaceId: string) {
      return activateWorkspaceMock(workspaceId);
    }
  },
}));

(mock as any).module('@/services/account-category.service', () => ({
  AccountCategoryService: class {
    async seedDefaultCategories(workspaceId: string, userId: string) {
      return seedDefaultCategoriesMock(workspaceId, userId);
    }
  },
}));

(mock as any).module('@/lib/auth/lucia', () => ({
  auth: {
    invalidateUserSessions: invalidateDbSessionsMock,
  },
}));

(mock as any).module('@/lib/auth/session-cache', () => ({
  invalidateUserSessions: invalidateSessionCacheMock,
}));

let GET: any;

function createApiContext(token: string | null) {
  const url = new URL('http://localhost/api/auth/verify-email');
  if (token) {
    url.searchParams.set('token', token);
  }

  return {
    request: new Request(url),
    redirect: (location: string, status: number) =>
      new Response(null, {
        status,
        headers: { Location: location },
      }),
  } as any;
}

describe('GET /api/auth/verify-email - email change branch', () => {
  beforeAll(async () => {
    ({ GET } = await import('@/pages/api/auth/verify-email'));
  });

  afterEach(() => {
    verifyEmailMock.mockClear();
    activateWorkspaceMock.mockClear();
    seedDefaultCategoriesMock.mockClear();
    invalidateDbSessionsMock.mockClear();
    invalidateSessionCacheMock.mockClear();
  });

  test('invalidates sessions and redirects to email-changed login banner', async () => {
    verifyEmailMock.mockImplementation(async () => ({
      success: true,
      emailChanged: true,
      user: {
        id: 'user-1',
        workspace_id: 'workspace-1',
        role: 'member',
      },
    }));

    const response = await GET(createApiContext('token-1'));

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login?email-changed=true');
    expect(invalidateDbSessionsMock).toHaveBeenCalledWith('user-1');
    expect(invalidateSessionCacheMock).toHaveBeenCalledWith('user-1');
    expect(activateWorkspaceMock).not.toHaveBeenCalled();
    expect(seedDefaultCategoriesMock).not.toHaveBeenCalled();
  });

  test('redirects to email_taken when race condition reports EMAIL_ALREADY_EXISTS', async () => {
    verifyEmailMock.mockImplementation(async () => ({
      success: false,
      error: 'EMAIL_ALREADY_EXISTS',
    }));

    const response = await GET(createApiContext('token-race'));

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login?error=email_taken');
    expect(invalidateDbSessionsMock).not.toHaveBeenCalled();
    expect(invalidateSessionCacheMock).not.toHaveBeenCalled();
  });
});
