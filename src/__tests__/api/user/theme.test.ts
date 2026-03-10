import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test';
import { userMetaService } from '@/services';

let PUT: any;

const originalSetUserMeta = userMetaService.setUserMeta;

function expectNormalizedIssue(issue: any, path: string[]) {
  expect(issue.path).toEqual(path);
  expect(typeof issue.message).toBe('string');
  expect(typeof issue.code).toBe('string');
}

function createApiContext(options: {
  body?: Record<string, unknown>;
  user?: { id: string; workspaceId: string; role: 'admin' | 'member' } | null;
}) {
  return {
    request: new Request('http://localhost/api/user/theme', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined,
    }),
    locals: {
      user:
        options.user !== undefined
          ? options.user
          : { id: 'user-1', workspaceId: 'ws-1', role: 'member' },
    },
  } as any;
}

describe('PUT /api/user/theme', () => {
  beforeAll(async () => {
    ({ PUT } = await import('@/pages/api/user/theme'));
  });

  afterEach(() => {
    userMetaService.setUserMeta = originalSetUserMeta;
  });

  it('returns 401 when unauthenticated', async () => {
    const response = await PUT(createApiContext({ user: null }));

    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid theme value', async () => {
    const response = await PUT(createApiContext({ body: { theme: 'rainbow' } }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
    expect(payload.error.details).toHaveLength(1);
    expectNormalizedIssue(payload.error.details[0], ['theme']);
  });

  it('returns 400 when theme is missing', async () => {
    const response = await PUT(createApiContext({ body: {} }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
    expect(payload.error.details).toHaveLength(1);
    expectNormalizedIssue(payload.error.details[0], ['theme']);
  });

  for (const theme of ['system', 'light', 'dark', 'monochrome'] as const) {
    it(`accepts valid theme "${theme}"`, async () => {
      userMetaService.setUserMeta = mock(async () => {}) as any;

      const response = await PUT(createApiContext({ body: { theme } }));
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.data.theme).toBe(theme);
    });
  }

  it('calls setUserMeta with correct args', async () => {
    let capturedArgs: unknown[] = [];
    userMetaService.setUserMeta = mock(async (...args: unknown[]) => {
      capturedArgs = args;
    }) as any;

    await PUT(createApiContext({ body: { theme: 'dark' } }));

    expect(capturedArgs[0]).toBe('user-1');
    expect(capturedArgs[1]).toBe('theme');
    expect(capturedArgs[2]).toBe('dark');
  });
});
