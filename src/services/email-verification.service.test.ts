/**
 * Unit tests for EmailVerificationService
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { EmailVerificationService } from './email-verification.service';
import { db } from '@/db/index';
import { users, workspaces, emailVerificationTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { hashPassword } from '@/lib/auth/password';

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let testUserId: string;
  let testWorkspaceId: string;

  async function cleanupTestData() {
    if (testUserId) {
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
      const token = await service.createVerificationToken(testUserId);
      // Create a second token
      await service.createVerificationToken(testUserId);

      await service.verifyEmail(token);

      // All tokens should be deleted
      const remainingTokens = await db
        .select()
        .from(emailVerificationTokens)
        .where(eq(emailVerificationTokens.user_id, testUserId));

      expect(remainingTokens.length).toBe(0);
    });
  });
});
