import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';

export interface AuthAccountState {
  role: string;
  deletedAt: Date | null;
  workspaceInactive: boolean;
}

export interface AuthRequestGuardDeps {
  isDemoMode: () => boolean;
  loadAccountState: (userId: string) => Promise<AuthAccountState | null>;
}

// The demo account's credentials are public, so anything that would lock the
// next visitor out, or register a client, is refused on the server.
const DEMO_BLOCKED_PATHS: ReadonlySet<string> = new Set([
  '/change-password',
  '/change-email',
  '/two-factor/enable',
  '/two-factor/disable',
  '/passkey/generate-register-options',
  '/passkey/verify-registration',
  '/passkey/delete-passkey',
  '/delete-user',
  '/delete-user/callback',
  '/oauth2/create-client',
  '/oauth2/update-client',
  '/oauth2/delete-client',
  '/oauth2/client/rotate-secret',
]);
const DEMO_BLOCKED_PREFIXES = ['/admin/oauth2/'];

// The app middleware reads /get-session on every request and handles deactivated
// users itself; /sign-out must keep working so they can leave.
const SESSION_CHECK_EXEMPT_PATHS: ReadonlySet<string> = new Set(['/get-session', '/sign-out']);

export function isDemoBlockedAuthPath(path: string): boolean {
  return DEMO_BLOCKED_PATHS.has(path) || DEMO_BLOCKED_PREFIXES.some((p) => path.startsWith(p));
}

function hasCookie(cookieHeader: string | null | undefined, name: string): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.split(';').some((part) => part.trim().startsWith(`${name}=`));
}

/** Better Auth `hooks.before`: demo-mode blocks, then deactivated users and archived workspaces. */
export function createAuthRequestGuard(deps: AuthRequestGuardDeps) {
  return createAuthMiddleware(async (ctx) => {
    const path = ctx.path ?? '';

    if (deps.isDemoMode() && isDemoBlockedAuthPath(path)) {
      throw new APIError('FORBIDDEN', {
        message: 'This action is disabled in demo mode',
        code: 'DEMO_MODE',
      });
    }

    if (SESSION_CHECK_EXEMPT_PATHS.has(path)) return;
    if (!hasCookie(ctx.headers?.get('cookie'), ctx.context.authCookies.sessionToken.name)) return;

    // Cached on ctx.context, so the endpoint's own session middleware reuses it.
    const session = await getSessionFromCtx(ctx);
    if (!session) return;

    const account = await deps.loadAccountState(session.user.id);
    if (!account) return;

    if (account.deletedAt) {
      throw new APIError('FORBIDDEN', {
        message: 'This account has been deactivated',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    if (account.workspaceInactive && account.role !== 'super_admin') {
      throw new APIError('FORBIDDEN', {
        message: 'This workspace has been archived',
        code: 'WORKSPACE_INACTIVE',
      });
    }
  });
}
