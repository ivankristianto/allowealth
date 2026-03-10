import { APIError } from 'better-auth';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db, getActiveSchema, runTransaction, type IDatabase } from '@/db';
import { getSignupMode } from '@/lib/auth/signup-mode';
import { createLogger } from '@/lib/logger';
import type { AuthUser, BetterAuthUser } from '@/lib/auth/types';
import { AccountCategoryService } from './account-category.service';
import { WorkspaceInvitationService } from './workspace-invitation.service';

const log = createLogger('auth');

export const AUTH_ERRORS = {
  INVITATION_REQUIRED: 'INVITATION_REQUIRED',
  INVALID_INVITATION: 'INVALID_INVITATION',
  GOOGLE_ACCOUNT_NOT_LINKED: 'GOOGLE_ACCOUNT_NOT_LINKED',
  BOOTSTRAP_FAILED: 'BOOTSTRAP_FAILED',
} as const;

export const GOOGLE_ACCOUNT_NOT_LINKED_MESSAGE =
  'Sign in with your existing method first, then connect Google from Settings > Security.';

type AuthHookContext = {
  body?: Record<string, unknown> | null;
  request?: Request;
} | null;

type AuthProvider = 'credential' | 'google';

type DomainUserRow = (typeof schema.users)['$inferSelect'];

const schema = getActiveSchema();

function getInvitationToken(context: AuthHookContext): string | null {
  const token = context?.body?.invitationToken;
  return typeof token === 'string' && token.length > 0 ? token : null;
}

function getAuthProvider(context: AuthHookContext): AuthProvider {
  const pathname = context?.request ? new URL(context.request.url).pathname : '';
  return pathname.includes('/callback/google') ? 'google' : 'credential';
}

function requireEmail(authUser: BetterAuthUser): string {
  if (!authUser.email) {
    throw new Error('Better Auth user is missing an email address');
  }

  return authUser.email.toLowerCase();
}

function mapDomainUser(domainUser: DomainUserRow): AuthUser {
  return {
    id: domainUser.id,
    email: domainUser.email,
    name: domainUser.name,
    role: domainUser.role,
    workspaceId: domainUser.workspace_id ?? null,
    avatarUrl: domainUser.avatar_url ?? null,
    deletedAt: domainUser.deleted_at ?? null,
  };
}

async function ensureSignupAllowed(
  authUser: BetterAuthUser,
  context: AuthHookContext,
  database: IDatabase
): Promise<void> {
  if (getSignupMode() === 'public') {
    return;
  }

  const invitationToken = getInvitationToken(context);
  if (!invitationToken) {
    throw APIError.from('FORBIDDEN', {
      code: AUTH_ERRORS.INVITATION_REQUIRED,
      message: 'An invitation is required to create an account.',
    });
  }

  const invitationService = new WorkspaceInvitationService(database);
  const invitation = await invitationService.validateAndGet(invitationToken);

  if (invitation.email.toLowerCase() !== requireEmail(authUser)) {
    throw APIError.from('BAD_REQUEST', {
      code: AUTH_ERRORS.INVALID_INVITATION,
      message: 'This invitation is only valid for the invited email address.',
    });
  }
}

async function createWorkspaceOwner(
  authUser: BetterAuthUser,
  database: IDatabase
): Promise<AuthUser> {
  const workspaceId = nanoid();

  await runTransaction(database, async (tx) => {
    await tx.insert(schema.workspaces).values({
      id: workspaceId,
      name: `${authUser.name.trim()}'s Workspace`,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });

    await tx.insert(schema.users).values({
      id: authUser.id,
      workspace_id: workspaceId,
      email: requireEmail(authUser),
      password_hash: null,
      name: authUser.name.trim(),
      role: 'admin',
      avatar_url: authUser.image ?? null,
      email_verified_at: authUser.emailVerified === true ? new Date() : null,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
  });

  const accountCategoryService = new AccountCategoryService(database);
  await accountCategoryService.seedDefaultCategories(workspaceId, authUser.id);

  const domainUser = await database.query.users.findFirst({
    where: eq(schema.users.id, authUser.id),
  });

  if (!domainUser) {
    throw new Error('Failed to load bootstrapped workspace owner');
  }

  return mapDomainUser(domainUser);
}

async function createInvitedUser(
  authUser: BetterAuthUser,
  invitationToken: string,
  database: IDatabase
): Promise<AuthUser> {
  const invitationService = new WorkspaceInvitationService(database);
  const invitation = await invitationService.validateAndGet(invitationToken);

  if (invitation.email.toLowerCase() !== requireEmail(authUser)) {
    throw new Error('Invitation email does not match the authenticated user');
  }

  await database.insert(schema.users).values({
    id: authUser.id,
    workspace_id: invitation.workspace_id,
    email: requireEmail(authUser),
    password_hash: null,
    name: authUser.name.trim(),
    role: invitation.role,
    avatar_url: authUser.image ?? null,
    email_verified_at: authUser.emailVerified === true ? new Date() : null,
    deleted_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  });

  await invitationService.accept(invitationToken);

  const domainUser = await database.query.users.findFirst({
    where: eq(schema.users.id, authUser.id),
  });

  if (!domainUser) {
    throw new Error('Failed to load invited workspace member');
  }

  return mapDomainUser(domainUser);
}

export async function beforeAuthUserCreate(
  authUser: BetterAuthUser,
  context: AuthHookContext,
  database: IDatabase = db
): Promise<void> {
  await ensureSignupAllowed(authUser, context, database);
}

export async function bootstrapAuthUser(
  authUser: BetterAuthUser,
  context: AuthHookContext,
  provider: AuthProvider = getAuthProvider(context),
  database: IDatabase = db
): Promise<AuthUser> {
  const existingDomainUser = await database.query.users.findFirst({
    where: eq(schema.users.id, authUser.id),
  });

  if (existingDomainUser) {
    return mapDomainUser(existingDomainUser);
  }

  try {
    const invitationToken = getInvitationToken(context);

    if (invitationToken) {
      const invitedUser = await createInvitedUser(authUser, invitationToken, database);
      log.info('Bootstrapped invited auth user', { userId: invitedUser.id });
      return invitedUser;
    }

    const workspaceOwner = await createWorkspaceOwner(authUser, database);
    log.info('Bootstrapped auth user workspace', {
      userId: workspaceOwner.id,
      provider,
      workspaceId: workspaceOwner.workspaceId,
    });
    return workspaceOwner;
  } catch (error) {
    log.error('Failed to bootstrap auth user', {
      userId: authUser.id,
      provider,
      error,
    });

    throw error instanceof Error
      ? error
      : new Error('Failed to bootstrap auth user domain data');
  }
}

export function getGoogleAuthErrorMessage(errorCode?: string | null): string | null {
  if (errorCode === 'account_not_linked') {
    return GOOGLE_ACCOUNT_NOT_LINKED_MESSAGE;
  }

  return null;
}

export async function getGoogleSignInStatus(
  email: string,
  database: IDatabase = db
): Promise<{ status: 'blocked' | 'linked' | 'new-user'; message?: string }> {
  const normalizedEmail = email.toLowerCase();
  const domainUser = await database.query.users.findFirst({
    where: eq(schema.users.email, normalizedEmail),
  });

  if (!domainUser) {
    return { status: 'new-user' };
  }

  const linkedGoogleAccount = await database.query.account.findFirst({
    where: and(eq(schema.account.userId, domainUser.id), eq(schema.account.providerId, 'google')),
  });

  if (linkedGoogleAccount) {
    return { status: 'linked' };
  }

  return {
    status: 'blocked',
    message: GOOGLE_ACCOUNT_NOT_LINKED_MESSAGE,
  };
}

export async function getLinkedOAuthAccounts(
  userId: string,
  database: IDatabase = db
): Promise<Array<{ id: string; provider: string; email?: string; connected: boolean }>> {
  const [domainUser, linkedAccounts] = await Promise.all([
    database.query.users.findFirst({
      where: eq(schema.users.id, userId),
    }),
    database.query.account.findMany({
      where: eq(schema.account.userId, userId),
    }),
  ]);

  return linkedAccounts.map((linkedAccount) => ({
    id: linkedAccount.id,
    provider: linkedAccount.providerId,
    email: domainUser?.email,
    connected: true,
  }));
}
