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

describe('UserService', () => {
  const userService = new UserService(db);

  const testEmail1 = 'userServiceTest@example.com';
  const testEmail2 = 'userServiceTest2@example.com';
  const testPassword = 'SecurePassword123!';
  const testName = 'Test User';

  // Clean up test database before each test
  beforeEach(async () => {
    // Delete test users and their meta
    const testUsers = await db.query.users.findMany({
      where: (users, { or }) =>
        or(eq(users.email, testEmail1.toLowerCase()), eq(users.email, testEmail2.toLowerCase())),
    });

    for (const user of testUsers) {
      await db.delete(userMeta).where(eq(userMeta.user_id, user.id));
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  // Clean up after all tests
  afterEach(async () => {
    const testUsers = await db.query.users.findMany({
      where: (users, { or }) =>
        or(eq(users.email, testEmail1.toLowerCase()), eq(users.email, testEmail2.toLowerCase())),
    });

    for (const user of testUsers) {
      await db.delete(userMeta).where(eq(userMeta.user_id, user.id));
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  describe('updateProfile', () => {
    it('should update user name and email', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);

      const newEmail = `updated-${nanoid()}@example.com`;
      const updatedUser = await userService.updateProfile(user.id, {
        name: 'Updated Name',
        email: newEmail,
      });

      expect(updatedUser).toBeDefined();
      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.email).toBe(newEmail.toLowerCase());
    });

    it('should normalize email to lowercase', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);
      const newEmail = `uppercase-${nanoid()}@EXAMPLE.COM`;

      const updatedUser = await userService.updateProfile(user.id, {
        name: 'Test User',
        email: newEmail,
      });

      expect(updatedUser.email).toBe(newEmail.toLowerCase());
    });

    it('should trim name whitespace', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);

      const updatedUser = await userService.updateProfile(user.id, {
        name: '  Trimmed Name  ',
        email: testEmail1,
      });

      expect(updatedUser.name).toBe('Trimmed Name');
    });

    it('should allow updating same email for same user', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);

      const updatedUser = await userService.updateProfile(user.id, {
        name: 'Updated Name',
        email: testEmail1,
      });

      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.email).toBe(testEmail1.toLowerCase());
    });

    it('should throw error for duplicate email', async () => {
      const user1 = await createTestUser(testEmail1, testPassword, 'User 1');
      await createTestUser(testEmail2, testPassword, 'User 2');

      expect(
        userService.updateProfile(user1.id, {
          name: 'Updated Name',
          email: testEmail2,
        })
      ).rejects.toThrow();
    });

    it('should throw error with EMAIL_ALREADY_EXISTS code for duplicate email', async () => {
      const user1 = await createTestUser(testEmail1, testPassword, 'User 1');
      await createTestUser(testEmail2, testPassword, 'User 2');

      expect(
        userService.updateProfile(user1.id, {
          name: 'Updated Name',
          email: testEmail2,
        })
      ).rejects.toMatchObject({
        code: ServiceErrorCode.EMAIL_ALREADY_EXISTS,
      });
    });

    it('should throw error for non-existent user', async () => {
      expect(
        userService.updateProfile('non-existent-id', {
          name: 'Updated Name',
          email: 'updated@example.com',
        })
      ).rejects.toThrow();
    });

    it('should throw error with USER_NOT_FOUND code for non-existent user', async () => {
      expect(
        userService.updateProfile('non-existent-id', {
          name: 'Updated Name',
          email: 'updated@example.com',
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
          email: testEmail1,
        })
      ).rejects.toThrow();
    });

    it('should throw validation error for invalid email', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);

      expect(
        userService.updateProfile(user.id, {
          name: 'Test User',
          email: 'invalid-email',
        })
      ).rejects.toThrow();
    });

    it('should throw validation error for name exceeding 255 characters', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);

      expect(
        userService.updateProfile(user.id, {
          name: 'a'.repeat(256),
          email: testEmail1,
        })
      ).rejects.toThrow();
    });
  });

  describe('updatePassword', () => {
    it('should update password with valid old password', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);

      const result = await userService.updatePassword(user.id, {
        oldPassword: testPassword,
        newPassword: 'NewPassword456!',
      });

      expect(result).toEqual({ success: true });
    });

    it('should hash new password', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);
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

      expect(
        userService.updatePassword(user.id, {
          oldPassword: 'WrongPassword123!',
          newPassword: 'NewPassword456!',
        })
      ).rejects.toThrow();
    });

    it('should throw error with INVALID_PASSWORD code for invalid old password', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);

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

      expect(
        userService.updatePassword(user.id, {
          oldPassword: testPassword,
          newPassword: 'Short1!',
        })
      ).rejects.toThrow();
    });

    it('should throw validation error for new password without letters', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);

      expect(
        userService.updatePassword(user.id, {
          oldPassword: testPassword,
          newPassword: '123456789012!',
        })
      ).rejects.toThrow();
    });

    it('should throw validation error for new password without numbers or special chars', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);

      expect(
        userService.updatePassword(user.id, {
          oldPassword: testPassword,
          newPassword: 'abcdefghijkl',
        })
      ).rejects.toThrow();
    });

    it('should accept 12 character password with letters and numbers', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);

      const result = await userService.updatePassword(user.id, {
        oldPassword: testPassword,
        newPassword: 'Password123!',
      });

      expect(result).toEqual({ success: true });
    });
  });

  describe('Integration', () => {
    it('should complete full user profile flow', async () => {
      // Create user
      const user = await createTestUser(testEmail1, testPassword, testName);

      // Update profile
      const updatedUser = await userService.updateProfile(user.id, {
        name: 'Updated Name',
        email: `updated-${nanoid()}@example.com`,
      });
      expect(updatedUser.name).toBe('Updated Name');

      // Update password
      const passwordResult = await userService.updatePassword(user.id, {
        oldPassword: testPassword,
        newPassword: 'NewPassword456!',
      });
      expect(passwordResult).toEqual({ success: true });
    });
  });
});
