export type TenantRole = 'admin' | 'member' | 'super_admin';

export interface TenantContext {
  userId: string;
  workspaceId: string | null;
  role: TenantRole;
}

export interface TenantContextInput {
  userId?: string;
  workspaceId?: string;
  role?: TenantRole;
}

export function requireTenantContext(input: TenantContextInput): TenantContext {
  const userId = input.userId?.trim() ?? '';
  if (!userId) {
    throw new Error('Invalid tenant context: userId is required');
  }

  if (input.role === 'super_admin') {
    return { userId, workspaceId: null, role: 'super_admin' };
  }

  const workspaceId = input.workspaceId?.trim() ?? '';
  if (!workspaceId) {
    throw new Error('Invalid tenant context: workspaceId is required');
  }

  return {
    userId,
    workspaceId,
    role: input.role ?? 'member',
  };
}
