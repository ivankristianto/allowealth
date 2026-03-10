/**
 * Unit tests for EmailVerificationService
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { EmailVerificationService } from './email-verification.service';
import { db } from '@/db/index';
import { users, workspaces, emailVerificationTokens, userMeta, oauthAccounts } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { hashPassword } from '@/lib/auth/password';
import { USER_META_KEYS } from '@/lib/constants/user-meta-keys';
import { account as authAccounts, user as authUsers } from '@/db/schema/sqlite/better-auth';

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let testUserId: string;
  let testWorkspaceId: string;

  async function cleanupTestData() {
    if (testUserId) {
      await db.delete(authAccounts).where(eq(authAccounts.userId, testUserId));
      await db.delete(authUsers).where(eq(authUsers.id, testUserId));
      await db.delete(oauthAccounts).where(eq(oauthAccounts.user_id, testUserId));
      await db.delete(userMeta).where(eq(userMeta.user_id, testUserId));
      await db
        .delete(emailVerificationTokens)
        .where(eq(emailVerificationTokens.user_id, testUserId));
    }
    if (testWorkspaceId) {
      await db.delete(workspaces).where(eq(workspaces.id, testWorkspaceId));
    }
  }

  beforeEach(async () => {
    service = new EmailVerificationService(db);

    testWorkspaceId = nanoid();
    testUserId = nanoid();

    // Create test workspace
    await db.insert(workspaces).values({
      id: testWorkspaceId,
      name: 'Test Workspace',
      status: 'inactive',
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create test user
    await db.insert(users).values({
      id: testUserId,
      email: `test-${nanoid(8)}@example.com`,
      password_hash: await hashPassword('TestPassword123!'),
      name: 'Test User',
      workspace_id: testWorkspaceId,
      role: 'admin',
    });

    const domainUser = await db.query.users.findFirst({
      where: eq(users.id, testUserId),
    });

    await db.insert(authUsers).values({
      id: testUserId,
      email: domainUser!.email,
      name: domainUser!.name,
      emailVerified: true,
      image: null,
      twoFactorEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('createVerificationToken', () => {
    it('should create verification token with 24h expiration', async () => {
      const token = await service.createVerificationToken(testUserId);

      expect(token).toBeTruthy();
      expect(token.length).toBe(64);

      // Verify token in database
      const dbToken = await db
        .select()
        .from(emailVerificationTokens)
        .where(eq(emailVerificationTokens.user_id, testUserId))
        .limit(1);

      expect(dbToken.length).toBe(1);
      expect(dbToken[0].token).toBe(token);

      // Check expiration is ~24 hours from now
      const expiresIn = dbToken[0].expires_at.getTime() - Date.now();
      expect(expiresIn).toBeGreaterThan(23 * 60 * 60 * 1000);
      expect(expiresIn).toBeLessThan(25 * 60 * 60 * 1000);
    });
  });

  describe('requestEmailChange', () => {
    it('should store pending email in user_meta and create verification token', async () => {
      await db.update(users).set({ email_verified_at: new Date() }).where(eq(users.id, testUserId));

      await service.requestEmailChange(testUserId, 'newemail@example.com');

      const meta = await db.query.userMeta.findFirst({
        where: and(
          eq(userMeta.user_id, testUserId),
          eq(userMeta.meta_key, USER_META_KEYS.PENDING_EMAIL)
        ),
      });
      expect(meta).toBeTruthy();
      expect(meta?.meta_value).toBe('newemail@example.com');

      const token = await db.query.emailVerificationTokens.findFirst({
        where: eq(emailVerificationTokens.user_id, testUserId),
      });
      expect(token).toBeTruthy();
    });

    it('should throw if new email is already taken', async () => {
      await db.update(users).set({ email_verified_at: new Date() }).where(eq(users.id, testUserId));

      const otherUserId = nanoid();
      await db.insert(users).values({
        id: otherUserId,
        email: 'taken@example.com',
        password_hash: await hashPassword('TestPassword123!'),
        name: 'Other User',
        workspace_id: testWorkspaceId,
        role: 'member',
      });

      await expect(service.requestEmailChange(testUserId, 'taken@example.com')).rejects.toThrow(
        'Email already exists'
      );

      await db.delete(users).where(eq(users.id, otherUserId));
    });

    it('should no-op when new email equals current email', async () => {
      await db.update(users).set({ email_verified_at: new Date() }).where(eq(users.id, testUserId));

      const user = await db.query.users.findFirst({ where: eq(users.id, testUserId) });
      await service.requestEmailChange(testUserId, user!.email);

      const meta = await db.query.userMeta.findFirst({
        where: and(
          eq(userMeta.user_id, testUserId),
          eq(userMeta.meta_key, USER_META_KEYS.PENDING_EMAIL)
        ),
      });
      expect(meta).toBeUndefined();
    });

    it('should overwrite pending change when requesting again', async () => {
      await db.update(users).set({ email_verified_at: new Date() }).where(eq(users.id, testUserId));

      await service.requestEmailChange(testUserId, 'first@example.com');
      await service.requestEmailChange(testUserId, 'second@example.com');

      const meta = await db.query.userMeta.findFirst({
        where: and(
          eq(userMeta.user_id, testUserId),
          eq(userMeta.meta_key, USER_META_KEYS.PENDING_EMAIL)
        ),
      });
      expect(meta?.meta_value).toBe('second@example.com');

      const tokens = await db
        .select()
        .from(emailVerificationTokens)
        .where(eq(emailVerificationTokens.user_id, testUserId));
      expect(tokens.length).toBe(1);
    });

    it('should unlink Better Auth social accounts when requesting email change', async () => {
      await db.update(users).set({ email_verified_at: new Date() }).where(eq(users.id, testUserId));

      await db.insert(authAccounts).values([
        {
          id: nanoid(),
          accountId: `credential-${nanoid(8)}`,
          providerId: 'credential',
          userId: testUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: nanoid(),
          accountId: `google-${nanoid(8)}`,
          providerId: 'google',
          userId: testUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: nanoid(),
          accountId: `github-${nanoid(8)}`,
          providerId: 'github',
          userId: testUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      await db.insert(oauthAccounts).values([
        {
          id: nanoid(),
          user_id: testUserId,
          provider: 'google',
          provider_account_id: `google-${nanoid(8)}`,
          email: 'oauth-google@example.com',
          created_at: new Date(),
        },
        {
          id: nanoid(),
          user_id: testUserId,
          provider: 'github',
          provider_account_id: `github-${nanoid(8)}`,
          email: 'oauth-github@example.com',
          created_at: new Date(),
        },
      ]);

      await service.requestEmailChange(testUserId, 'oauth-unlink@example.com');

      const remainingAuthAccounts = await db
        .select()
        .from(authAccounts)
        .where(eq(authAccounts.userId, testUserId));
      const remainingOauthAccounts = await db
        .select()
        .from(oauthAccounts)
        .where(eq(oauthAccounts.user_id, testUserId));
      expect(remainingAuthAccounts).toHaveLength(1);
      expect(remainingAuthAccounts[0].providerId).toBe('credential');
      expect(remainingOauthAccounts.length).toBe(0);
    });
  });

  describe('getPendingEmailChange', () => {
    it('should return pending email when set', async () => {
      await db.insert(userMeta).values({
        meta_id: nanoid(),
        user_id: testUserId,
        meta_key: USER_META_KEYS.PENDING_EMAIL,
        meta_value: 'pending@example.com',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.getPendingEmailChange(testUserId);
      expect(result).toBe('pending@example.com');
    });

    it('should return null when no pending change', async () => {
      const result = await service.getPendingEmailChange(testUserId);
      expect(result).toBeNull();
    });
  });

  describe('verifyEmail', () => {
    it('should verify email and mark user as verified', async () => {
      const token = await service.createVerificationToken(testUserId);

      const result = await service.verifyEmail(token);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user).toBeTruthy();
        expect(result.user.id).toBe(testUserId);
      }

      // Check user is marked as verified
      const user = await db.query.users.findFirst({
        where: eq(users.id, testUserId),
      });

      expect(user?.email_verified_at).toBeTruthy();
    });

    it('should return error for invalid token', async () => {
      const result = await service.verifyEmail('invalid-token');

      expect(result.success).toBe(false);
      expect('error' in result && result.error).toBe('INVALID_TOKEN');
    });

    it('should return error for expired token', async () => {
      const expiredToken = nanoid(64);
      const pastTime = new Date(Date.now() - 25 * 60 * 60 * 1000);

      await db.insert(emailVerificationTokens).values({
        id: nanoid(),
        user_id: testUserId,
        token: expiredToken,
        expires_at: pastTime,
      });

      const result = await service.verifyEmail(expiredToken);

      expect(result.success).toBe(false);
      expect('error' in result && result.error).toBe('TOKEN_EXPIRED');
    });

    it('should be idempotent for already verified users', async () => {
      const token = await service.createVerificationToken(testUserId);

      // Verify once
      await service.verifyEmail(token);

      // Create new token and verify again
      const token2 = await service.createVerificationToken(testUserId);
      const result = await service.verifyEmail(token2);

      expect(result.success).toBe(true);
    });

    it('should delete all tokens after verification', async () => {
      // Creating a new token replaces any existing tokens
      await service.createVerificationToken(testUserId);
      const token2 = await service.createVerificationToken(testUserId);

      await service.verifyEmail(token2);

      // All tokens should be deleted
      const remainingTokens = await db
        .select()
        .from(emailVerificationTokens)
        .where(eq(emailVerificationTokens.user_id, testUserId));

      expect(remainingTokens.length).toBe(0);
    });
  });

  describe('verifyEmail - email change', () => {
    it('should update user email when pending_email exists', async () => {
      await db.update(users).set({ email_verified_at: new Date() }).where(eq(users.id, testUserId));

      await db.insert(userMeta).values({
        meta_id: nanoid(),
        user_id: testUserId,
        meta_key: USER_META_KEYS.PENDING_EMAIL,
        meta_value: 'changed@example.com',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const token = await service.createVerificationToken(testUserId);
      const result = await service.verifyEmail(token);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.email).toBe('changed@example.com');
        expect(result.emailChanged).toBe(true);
      }

      const updatedUser = await db.query.users.findFirst({ where: eq(users.id, testUserId) });
      const updatedAuthUser = await db.query.user.findFirst({
        where: eq(authUsers.id, testUserId),
      });
      expect(updatedUser?.email).toBe('changed@example.com');
      expect(updatedAuthUser?.email).toBe('changed@example.com');

      const meta = await db.query.userMeta.findFirst({
        where: and(
          eq(userMeta.user_id, testUserId),
          eq(userMeta.meta_key, USER_META_KEYS.PENDING_EMAIL)
        ),
      });
      expect(meta).toBeUndefined();

      const tokens = await db
        .select()
        .from(emailVerificationTokens)
        .where(eq(emailVerificationTokens.user_id, testUserId));
      expect(tokens.length).toBe(0);
    });

    it('should fail gracefully if pending email was claimed by another user', async () => {
      await db.update(users).set({ email_verified_at: new Date() }).where(eq(users.id, testUserId));

      await db.insert(userMeta).values({
        meta_id: nanoid(),
        user_id: testUserId,
        meta_key: USER_META_KEYS.PENDING_EMAIL,
        meta_value: 'race@example.com',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const token = await service.createVerificationToken(testUserId);

      const otherUserId = nanoid();
      await db.insert(users).values({
        id: otherUserId,
        email: 'race@example.com',
        password_hash: await hashPassword('TestPassword123!'),
        name: 'Race User',
        workspace_id: testWorkspaceId,
        role: 'member',
      });

      const result = await service.verifyEmail(token);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect('error' in result && result.error).toBe('EMAIL_ALREADY_EXISTS');
      }

      await db.delete(users).where(eq(users.id, otherUserId));
    });

    it('should not set emailChanged for regular signup verification', async () => {
      const token = await service.createVerificationToken(testUserId);
      const result = await service.verifyEmail(token);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.emailChanged).toBeUndefined();
      }
    });
  });
});
