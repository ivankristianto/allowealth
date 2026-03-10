export type AuthRole = 'admin' | 'member' | 'super_admin';

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AuthRole;
  workspaceId: string | null;
  avatarUrl: string | null;
  deletedAt: Date | null;
}

export interface BetterAuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
}
