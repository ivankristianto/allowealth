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
 * Create a domain user the way Better Auth signup does: no local password hash.
 */
async function createTestUser(email: string, name: string) {
  await ensureTestWorkspace();

  const [user] = await db
    .insert(users)
    .values({
      id: nanoid(),
      workspace_id: TEST_WORKSPACE_ID,
      email: email.toLowerCase(),
      password_hash: null,
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
  const testName = 'Test User';

  // Clean up test database before each test
  beforeEach(async () => {
    // Delete test users and their meta
    const testUsers = await db.query.users.findMany({
      where: eq(users.email, testEmail1.toLowerCase()),
    });

    for (const user of testUsers) {
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
      await db.delete(userMeta).where(eq(userMeta.user_id, user.id));
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  describe('updateProfile', () => {
    it('should update user name only', async () => {
      const user = await createTestUser(testEmail1, testName);

      const updatedUser = await userService.updateProfile(user.id, {
        name: 'Updated Name',
      });

      expect(updatedUser).toBeDefined();
      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.email).toBe(testEmail1.toLowerCase());
    });

    it('should trim name whitespace', async () => {
      const user = await createTestUser(testEmail1, testName);

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
      const user = await createTestUser(testEmail1, testName);

      expect(
        userService.updateProfile(user.id, {
          name: '',
        })
      ).rejects.toThrow();
    });

    it('should throw validation error for name exceeding 255 characters', async () => {
      const user = await createTestUser(testEmail1, testName);

      expect(
        userService.updateProfile(user.id, {
          name: 'a'.repeat(256),
        })
      ).rejects.toThrow();
    });
  });

  describe('Integration', () => {
    it('should complete full user profile flow', async () => {
      // Create user
      const user = await createTestUser(testEmail1, testName);

      // Update profile
      const updatedUser = await userService.updateProfile(user.id, {
        name: 'Updated Name',
      });
      expect(updatedUser.name).toBe('Updated Name');
    });

    it('soft deletes a user by setting deleted_at', async () => {
      const user = await createTestUser(testEmail1, testName);

      await userService.softDelete(user.id);

      const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
      });

      expect(updatedUser?.deleted_at).toBeTruthy();
    });
  });
});
