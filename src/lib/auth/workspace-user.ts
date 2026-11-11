import type { AuthUser } from '@/lib/auth/types';

export type WorkspaceAuthUser = AuthUser & { workspaceId: string };

/** Super admins have no workspace, so workspace pages must check before querying. */
export function hasWorkspace(user: AuthUser | null | undefined): user is WorkspaceAuthUser {
  return typeof user?.workspaceId === 'string' && user.workspaceId !== '';
}
