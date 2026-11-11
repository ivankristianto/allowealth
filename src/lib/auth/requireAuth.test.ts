import { describe, expect, it } from 'bun:test';
import {
  getCurrentUser,
  isAuthenticated,
  requireAdmin,
  requireAuth,
  requireSuperAdmin,
} from './requireAuth';

type Role = 'super_admin' | 'admin' | 'member';

// The slice of Astro's page global these helpers read
function astroContext(path: string, role?: Role) {
  const url = new URL(path, 'http://localhost');
  return {
    url,
    locals: role ? { user: { id: 'user-1', role, workspaceId: 'ws-1' } } : {},
    redirect: (location: string, status = 302) =>
      new Response(null, { status, headers: { Location: location } }),
  };
}

async function errorBody(response: Response | null) {
  expect(response).toBeInstanceOf(Response);
  return { status: response!.status, body: await response!.json() };
}

describe('requireAuth', () => {
  it('lets a signed-in user through', () => {
    expect(requireAuth(astroContext('/budget', 'member'))).toBeNull();
  });

  it('redirects a guest to login with the path and query to return to', () => {
    const response = requireAuth(astroContext('/transactions?type=income&page=2'));

    expect(response?.status).toBe(302);
    expect(response?.headers.get('Location')).toBe(
      '/login?redirect=%2Ftransactions%3Ftype%3Dincome%26page%3D2'
    );
  });

  it('uses a custom login path when given', () => {
    const response = requireAuth(astroContext('/admin'), '/signin');
    expect(response?.headers.get('Location')).toBe('/signin?redirect=%2Fadmin');
  });

  it('treats missing locals as signed out', () => {
    const context = { ...astroContext('/budget'), locals: undefined };
    expect(requireAuth(context)?.status).toBe(302);
  });
});

describe('requireSuperAdmin', () => {
  it('lets a super admin through', () => {
    expect(requireSuperAdmin(astroContext('/admin', 'super_admin'))).toBeNull();
  });

  it('redirects a guest to login before checking the role', () => {
    expect(requireSuperAdmin(astroContext('/admin'))?.status).toBe(302);
  });

  for (const role of ['admin', 'member'] as const) {
    it(`returns a JSON 403 for a workspace ${role}`, async () => {
      const response = requireSuperAdmin(astroContext('/admin', role));

      expect(await errorBody(response)).toEqual({
        status: 403,
        body: { error: 'Super admin access required' },
      });
      expect(response?.headers.get('Content-Type')).toBe('application/json');
    });
  }
});

describe('requireAdmin', () => {
  it('lets a workspace admin through', () => {
    expect(requireAdmin(astroContext('/settings', 'admin'))).toBeNull();
  });

  it('redirects a guest to login', () => {
    expect(requireAdmin(astroContext('/settings'))?.status).toBe(302);
  });

  it('returns a JSON 403 for a member', async () => {
    expect(await errorBody(requireAdmin(astroContext('/settings', 'member')))).toEqual({
      status: 403,
      body: { error: 'Admin access required' },
    });
  });

  // Current behaviour: the check is an exact role match, so a super admin is refused too
  it('returns a JSON 403 for a super admin', async () => {
    const response = requireAdmin(astroContext('/settings', 'super_admin'));
    expect((await errorBody(response)).status).toBe(403);
  });
});

describe('isAuthenticated and getCurrentUser', () => {
  it('report the signed-in user', () => {
    const context = astroContext('/', 'member');

    expect(isAuthenticated(context)).toBe(true);
    expect(getCurrentUser(context)).toEqual({ id: 'user-1', role: 'member', workspaceId: 'ws-1' });
  });

  it('report a guest as signed out', () => {
    const context = astroContext('/');

    expect(isAuthenticated(context)).toBe(false);
    expect(getCurrentUser(context)).toBeNull();
  });
});
