/**
 * Unit tests for UserService
 *
 * Note: Settings-related tests have been moved to user-meta.service.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { UserService } from './user.service';
import { ServiceErrorCode } from './service-errors';
import { db } from '@/db/index';
import { users, userMeta, workspaces } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { hashPassword } from '@/lib/auth/password';
import {
  account as authAccounts,
  session as authSessions,
  user as authUsers,
} from '@/db/schema/sqlite/better-auth';

// Test workspace for all test users
const TEST_WORKSPACE_ID = 'test-workspace-user-service';

/**
 * Ensure test workspace exists
 */
async function ensureTestWorkspace() {
  const existing = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, TEST_WORKSPACE_ID),
  });
  if (!existing) {
    await db.insert(workspaces).values({
      id: TEST_WORKSPACE_ID,
      name: 'Test Workspace',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }
}

/**
 * Helper to create a test user
 */
async function createTestUser(email: string, password: string, name: string) {
  await ensureTestWorkspace();
  const userId = nanoid();
  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      id: userId,
      workspace_id: TEST_WORKSPACE_ID,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      name: name.trim(),
      role: 'admin',
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();

  return user;
}

async function seedAuthRecords(user: Awaited<ReturnType<typeof createTestUser>>) {
  await db.insert(authUsers).values({
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: true,
    image: null,
    twoFactorEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(authAccounts).values({
    id: nanoid(),
    accountId: user.email,
    providerId: 'credential',
    userId: user.id,
    password: 'legacy-auth-password-hash',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(authSessions).values([
    {
      id: nanoid(),
      token: `session-token-${nanoid(8)}`,
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: '127.0.0.1',
      userAgent: 'bun:test',
    },
    {
      id: nanoid(),
      token: `session-token-${nanoid(8)}`,
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: '127.0.0.2',
      userAgent: 'bun:test',
    },
  ]);
}

describe('UserService', () => {
  const userService = new UserService(db);

  const testEmail1 = 'userServiceTest@example.com';
  const testPassword = 'SecurePassword123!';
  const testName = 'Test User';

  // Clean up test database before each test
  beforeEach(async () => {
    // Delete test users and their meta
    const testUsers = await db.query.users.findMany({
      where: eq(users.email, testEmail1.toLowerCase()),
    });

    for (const user of testUsers) {
      await db.delete(authSessions).where(eq(authSessions.userId, user.id));
      await db.delete(authAccounts).where(eq(authAccounts.userId, user.id));
      await db.delete(authUsers).where(eq(authUsers.id, user.id));
      await db.delete(userMeta).where(eq(userMeta.user_id, user.id));
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  // Clean up after all tests
  afterEach(async () => {
    const testUsers = await db.query.users.findMany({
      where: eq(users.email, testEmail1.toLowerCase()),
    });

    for (const user of testUsers) {
      await db.delete(authSessions).where(eq(authSessions.userId, user.id));
      await db.delete(authAccounts).where(eq(authAccounts.userId, user.id));
      await db.delete(authUsers).where(eq(authUsers.id, user.id));
      await db.delete(userMeta).where(eq(userMeta.user_id, user.id));
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  describe('updateProfile', () => {
    it('should update user name only', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);

      const updatedUser = await userService.updateProfile(user.id, {
        name: 'Updated Name',
      });

      expect(updatedUser).toBeDefined();
      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.email).toBe(testEmail1.toLowerCase());
    });

    it('should trim name whitespace', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);

      const updatedUser = await userService.updateProfile(user.id, {
        name: '  Trimmed Name  ',
      });

      expect(updatedUser.name).toBe('Trimmed Name');
      expect(updatedUser.email).toBe(testEmail1.toLowerCase());
    });

    it('should throw error for non-existent user', async () => {
      expect(
        userService.updateProfile('non-existent-id', {
          name: 'Updated Name',
        })
      ).rejects.toThrow();
    });

    it('should throw error with USER_NOT_FOUND code for non-existent user', async () => {
      expect(
        userService.updateProfile('non-existent-id', {
          name: 'Updated Name',
        })
      ).rejects.toMatchObject({
        code: ServiceErrorCode.USER_NOT_FOUND,
      });
    });

    it('should throw validation error for empty name', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);

      expect(
        userService.updateProfile(user.id, {
          name: '',
        })
      ).rejects.toThrow();
    });

    it('should throw validation error for name exceeding 255 characters', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);

      expect(
        userService.updateProfile(user.id, {
          name: 'a'.repeat(256),
        })
      ).rejects.toThrow();
    });
  });

  describe('updatePassword', () => {
    it('should update password with valid old password', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);
      await seedAuthRecords(user);

      const result = await userService.updatePassword(user.id, {
        oldPassword: testPassword,
        newPassword: 'NewPassword456!',
      });

      expect(result).toEqual({ success: true, reauthRequired: true });
    });

    it('should hash new password', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);
      await seedAuthRecords(user);
      const newPassword = 'NewPassword456!';

      await userService.updatePassword(user.id, {
        oldPassword: testPassword,
        newPassword,
      });

      // Verify password is hashed in database
      const dbUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
      });

      expect(dbUser).toBeDefined();
      expect(dbUser?.password_hash).toBeDefined();
      expect(dbUser?.password_hash).not.toBe(newPassword);
    });

    it('should throw error for invalid old password', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);
      await seedAuthRecords(user);

      expect(
        userService.updatePassword(user.id, {
          oldPassword: 'WrongPassword123!',
          newPassword: 'NewPassword456!',
        })
      ).rejects.toThrow();
    });

    it('should throw error with INVALID_PASSWORD code for invalid old password', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);
      await seedAuthRecords(user);

      expect(
        userService.updatePassword(user.id, {
          oldPassword: 'WrongPassword123!',
          newPassword: 'NewPassword456!',
        })
      ).rejects.toMatchObject({
        code: ServiceErrorCode.INVALID_PASSWORD,
      });
    });

    it('should throw error for non-existent user', async () => {
      expect(
        userService.updatePassword('non-existent-id', {
          oldPassword: testPassword,
          newPassword: 'NewPassword456!',
        })
      ).rejects.toThrow();
    });

    it('should throw error with USER_NOT_FOUND code for non-existent user', async () => {
      expect(
        userService.updatePassword('non-existent-id', {
          oldPassword: testPassword,
          newPassword: 'NewPassword456!',
        })
      ).rejects.toMatchObject({
        code: ServiceErrorCode.USER_NOT_FOUND,
      });
    });

    it('should throw validation error for short new password', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);
      await seedAuthRecords(user);

      expect(
        userService.updatePassword(user.id, {
          oldPassword: testPassword,
          newPassword: 'Short1!',
        })
      ).rejects.toThrow();
    });

    it('should throw validation error for new password without letters', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);
      await seedAuthRecords(user);

      expect(
        userService.updatePassword(user.id, {
          oldPassword: testPassword,
          newPassword: '123456789012!',
        })
      ).rejects.toThrow();
    });

    it('should throw validation error for new password without numbers or special chars', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);
      await seedAuthRecords(user);

      expect(
        userService.updatePassword(user.id, {
          oldPassword: testPassword,
          newPassword: 'abcdefghijkl',
        })
      ).rejects.toThrow();
    });

    it('should accept 12 character password with letters and numbers', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);
      await seedAuthRecords(user);

      const result = await userService.updatePassword(user.id, {
        oldPassword: testPassword,
        newPassword: 'Password123!',
      });

      expect(result).toEqual({ success: true, reauthRequired: true });
    });

    it('should revoke all Better Auth sessions after a successful password change', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);
      await seedAuthRecords(user);

      await userService.updatePassword(user.id, {
        oldPassword: testPassword,
        newPassword: 'NewPassword456!',
      });

      const sessions = await db.query.session.findMany({
        where: eq(authSessions.userId, user.id),
      });
      expect(sessions).toHaveLength(0);
    });
  });

  describe('Integration', () => {
    it('should complete full user profile flow', async () => {
      // Create user
      const user = await createTestUser(testEmail1, testPassword, testName);
      await seedAuthRecords(user);

      // Update profile
      const updatedUser = await userService.updateProfile(user.id, {
        name: 'Updated Name',
      });
      expect(updatedUser.name).toBe('Updated Name');

      // Update password
      const passwordResult = await userService.updatePassword(user.id, {
        oldPassword: testPassword,
        newPassword: 'NewPassword456!',
      });
      expect(passwordResult).toEqual({ success: true, reauthRequired: true });
    });

    it('soft deletes a user by setting deleted_at', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);

      await userService.softDelete(user.id);

      const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
      });

      expect(updatedUser?.deleted_at).toBeTruthy();
    });
  });
});
