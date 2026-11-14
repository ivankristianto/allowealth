import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, workspaces } from '@/db/schema';
import type { AuthUser, BetterAuthUser } from '@/lib/auth/types';

export interface HydratedUser {
  user: AuthUser;
  workspaceInactive: boolean;
}

/** Loads the domain user and its workspace status; `fallback` fills fields the row leaves empty. */
export async function hydrateUser(
  userId: string,
  fallback?: Pick<BetterAuthUser, 'email' | 'name' | 'image'>
): Promise<HydratedUser | null> {
  // One query per request: the workspace status rides along with the user row.
  const [row] = await db
    .select({ user: users, workspaceStatus: workspaces.status })
    .from(users)
    .leftJoin(workspaces, eq(workspaces.id, users.workspace_id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) {
    return null;
  }

  const domainUser = row.user;
  const user: AuthUser = {
    id: domainUser.id,
    email: domainUser.email ?? fallback?.email,
    name: domainUser.name ?? fallback?.name,
    role: domainUser.role,
    workspaceId: domainUser.workspace_id ?? null,
    avatarUrl: domainUser.avatar_url ?? fallback?.image ?? null,
    deletedAt: domainUser.deleted_at ?? null,
  };

  return {
    user,
    workspaceInactive: domainUser.workspace_id != null && row.workspaceStatus !== 'active',
  };
}
