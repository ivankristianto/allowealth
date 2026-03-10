import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test';
import { workspaceInvitationService } from '@/services';

let POST: any;

const originalCreate = workspaceInvitationService.create;

function expectNormalizedIssue(issue: any, path: string[]) {
  expect(issue.path).toEqual(path);
  expect(typeof issue.message).toBe('string');
  expect(typeof issue.code).toBe('string');
}

function createApiContext(body: unknown) {
  return {
    request: new Request('http://localhost/api/workspace/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    locals: {
      user: {
        id: 'user-1',
        workspaceId: 'workspace-1',
        role: 'admin',
      },
    },
  } as any;
}

describe('POST /api/workspace/invitations validation', () => {
  beforeAll(async () => {
    ({ POST } = await import('@/pages/api/workspace/invitations'));
  });

  afterEach(() => {
    workspaceInvitationService.create = originalCreate;
  });

  it('returns normalized validation details for invalid invitations', async () => {
    const response = await POST(createApiContext({ email: 'not-an-email' }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
    expect(payload.error.details).toHaveLength(1);
    expectNormalizedIssue(payload.error.details[0], ['email']);
  });

  it('still accepts valid invitations and applies the default role', async () => {
    workspaceInvitationService.create = mock(async (input) => ({
      id: 'invite-1',
      email: input.email,
      role: input.role,
      expires_at: new Date('2026-03-20T00:00:00.000Z'),
      created_at: new Date('2026-03-10T00:00:00.000Z'),
    })) as any;

    const response = await POST(createApiContext({ email: 'teammate@example.com' }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(payload.data.role).toBe('member');
    expect(workspaceInvitationService.create).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      email: 'teammate@example.com',
      role: 'member',
      invitedByUserId: 'user-1',
    });
  });
});
