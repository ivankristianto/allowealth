import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { account, accountCategories, user as authUsers, users, workspaces } from '@/db/schema';
import { bootstrapAuthUser, getGoogleSignInStatus, getLinkedOAuthAccounts } from './auth.service';

const EMAIL_SIGNUP_USER = {
  id: 'auth-email-user',
  email: 'better-auth-email@example.com',
  name: 'Email Signup User',
  image: null,
};

const GOOGLE_SIGNUP_USER = {
  id: 'auth-google-user',
  email: 'better-auth-google@example.com',
  name: 'Google Signup User',
  image: 'https://example.com/avatar.png',
};

async function cleanupUser(userId: string, email: string) {
  await db.delete(account).where(eq(account.userId, userId));
  await db.delete(authUsers).where(eq(authUsers.id, userId));

  const domainUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (domainUser?.workspace_id) {
    await db.delete(workspaces).where(eq(workspaces.id, domainUser.workspace_id));
  } else {
    await db.delete(users).where(eq(users.id, userId));
  }

  const authDomainUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (authDomainUser?.workspace_id) {
    await db.delete(workspaces).where(eq(workspaces.id, authDomainUser.workspace_id));
  }
}

async function cleanupTestData() {
  await cleanupUser(EMAIL_SIGNUP_USER.id, EMAIL_SIGNUP_USER.email);
  await cleanupUser(GOOGLE_SIGNUP_USER.id, GOOGLE_SIGNUP_USER.email);
}

describe('AuthService', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it('new email/password signup bootstraps a workspace exactly once', async () => {
    await bootstrapAuthUser(EMAIL_SIGNUP_USER, { body: {} }, 'credential');
    await bootstrapAuthUser(EMAIL_SIGNUP_USER, { body: {} }, 'credential');

    const domainUser = await db.query.users.findFirst({
      where: eq(users.id, EMAIL_SIGNUP_USER.id),
    });

    expect(domainUser).toBeDefined();
    expect(domainUser?.workspace_id).toBeDefined();

    const seededCategories = await db.query.accountCategories.findMany({
      where: eq(accountCategories.workspace_id, domainUser!.workspace_id),
    });

    expect(seededCategories.length).toBeGreaterThan(0);
    expect(
      await db.query.users.findMany({
        where: eq(users.email, EMAIL_SIGNUP_USER.email),
      })
    ).toHaveLength(1);
  });

  it('new Google signup bootstraps a workspace exactly once', async () => {
    await bootstrapAuthUser(GOOGLE_SIGNUP_USER, null, 'google');
    await bootstrapAuthUser(GOOGLE_SIGNUP_USER, null, 'google');

    const domainUser = await db.query.users.findFirst({
      where: eq(users.id, GOOGLE_SIGNUP_USER.id),
    });

    expect(domainUser).toBeDefined();
    expect(domainUser?.avatar_url).toBe(GOOGLE_SIGNUP_USER.image);

    expect(
      await db.query.users.findMany({
        where: eq(users.email, GOOGLE_SIGNUP_USER.email),
      })
    ).toHaveLength(1);
  });

  it('existing local-account user attempting Google sign-in without prior linking is rejected with guidance', async () => {
    await bootstrapAuthUser(EMAIL_SIGNUP_USER, { body: {} }, 'credential');

    const status = await getGoogleSignInStatus(EMAIL_SIGNUP_USER.email);

    expect(status.status).toBe('blocked');
    expect(status.message).toContain('connect Google');
  });

  it('linked Google account login succeeds without the pending-link flow', async () => {
    await bootstrapAuthUser(GOOGLE_SIGNUP_USER, null, 'google');
    await db.insert(authUsers).values({
      id: GOOGLE_SIGNUP_USER.id,
      email: GOOGLE_SIGNUP_USER.email,
      name: GOOGLE_SIGNUP_USER.name,
      emailVerified: true,
      image: GOOGLE_SIGNUP_USER.image,
      twoFactorEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(account).values({
      id: 'google-linked-account',
      accountId: 'google-account-1',
      providerId: 'google',
      userId: GOOGLE_SIGNUP_USER.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const status = await getGoogleSignInStatus(GOOGLE_SIGNUP_USER.email);
    const linkedAccounts = await getLinkedOAuthAccounts(GOOGLE_SIGNUP_USER.id);

    expect(status.status).toBe('linked');
    expect(linkedAccounts.some((linkedAccount) => linkedAccount.provider === 'google')).toBe(true);
  });
});
