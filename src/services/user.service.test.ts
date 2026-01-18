/**
 * Unit tests for UserService
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { UserService } from './user.service';
import { UserServiceError, ServiceErrorCode } from './service-errors';
import { db } from '@/db/index';
import { users, userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { hashPassword } from '@/lib/auth/password';

/**
 * Helper to create a test user
 */
async function createTestUser(email: string, password: string, name: string) {
  const userId = nanoid();
  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      id: userId,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      name: name.trim(),
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();

  return user;
}

/**
 * Helper to create test settings for a user
 */
async function createTestSettings(
  userId: string,
  settings?: {
    primary_currency?: 'IDR' | 'USD';
    show_converted_totals?: boolean;
    show_individual_currencies?: boolean;
  }
) {
  const [newSettings] = await db
    .insert(userSettings)
    .values({
      user_id: userId,
      primary_currency: settings?.primary_currency ?? 'IDR',
      show_converted_totals: settings?.show_converted_totals ?? true,
      show_individual_currencies: settings?.show_individual_currencies ?? true,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();

  return newSettings;
}

describe('UserService', () => {
  const userService = new UserService(db);

  const testEmail1 = 'userServiceTest@example.com';
  const testEmail2 = 'userServiceTest2@example.com';
  const testPassword = 'SecurePassword123!';
  const testName = 'Test User';

  // Clean up test database before each test
  beforeEach(async () => {
    // Delete test users and their settings
    const testUsers = await db.query.users.findMany({
      where: (users, { or }) =>
        or(eq(users.email, testEmail1.toLowerCase()), eq(users.email, testEmail2.toLowerCase())),
    });

    for (const user of testUsers) {
      await db.delete(userSettings).where(eq(userSettings.user_id, user.id));
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
      await db.delete(userSettings).where(eq(userSettings.user_id, user.id));
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

  describe('updateSettings', () => {
    it('should update primary currency', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);

      const settings = await userService.updateSettings(user.id, {
        primaryCurrency: 'USD',
      });

      expect(settings.primaryCurrency).toBe('USD');
    });

    it('should update show converted totals', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);

      const settings = await userService.updateSettings(user.id, {
        primaryCurrency: 'IDR',
        showConvertedTotals: false,
      });

      expect(settings.showConvertedTotals).toBe(false);
    });

    it('should update show individual currencies', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);

      const settings = await userService.updateSettings(user.id, {
        primaryCurrency: 'IDR',
        showIndividualCurrencies: false,
      });

      expect(settings.showIndividualCurrencies).toBe(false);
    });

    it('should update all settings at once', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);

      const settings = await userService.updateSettings(user.id, {
        primaryCurrency: 'USD',
        showConvertedTotals: false,
        showIndividualCurrencies: false,
      });

      expect(settings).toEqual({
        primaryCurrency: 'USD',
        showConvertedTotals: false,
        showIndividualCurrencies: false,
      });
    });

    it('should create settings if they do not exist', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);

      // Settings should not exist initially
      const existingSettings = await db.query.userSettings.findFirst({
        where: eq(userSettings.user_id, user.id),
      });
      expect(existingSettings).toBeUndefined();

      // Update should create settings
      const settings = await userService.updateSettings(user.id, {
        primaryCurrency: 'USD',
      });

      expect(settings.primaryCurrency).toBe('USD');
    });

    it('should apply defaults for optional fields when creating new settings', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);

      const settings = await userService.updateSettings(user.id, {
        primaryCurrency: 'USD',
      });

      expect(settings).toEqual({
        primaryCurrency: 'USD',
        showConvertedTotals: true,
        showIndividualCurrencies: true,
      });
    });

    it('should update existing settings without changing unspecified fields', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);
      await createTestSettings(user.id, {
        primary_currency: 'IDR',
        show_converted_totals: false,
        show_individual_currencies: false,
      });

      const settings = await userService.updateSettings(user.id, {
        primaryCurrency: 'USD',
      });

      expect(settings).toEqual({
        primaryCurrency: 'USD',
        showConvertedTotals: false,
        showIndividualCurrencies: false,
      });
    });

    it('should throw error for non-existent user', async () => {
      expect(
        userService.updateSettings('non-existent-id', {
          primaryCurrency: 'USD',
        })
      ).rejects.toThrow();
    });

    it('should throw error with USER_NOT_FOUND code for non-existent user', async () => {
      expect(
        userService.updateSettings('non-existent-id', {
          primaryCurrency: 'USD',
        })
      ).rejects.toMatchObject({
        code: ServiceErrorCode.USER_NOT_FOUND,
      });
    });

    it('should throw validation error for invalid currency', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);

      expect(
        userService.updateSettings(user.id, {
          primaryCurrency: 'EUR' as any,
        })
      ).rejects.toThrow();
    });
  });

  describe('getSettings', () => {
    it('should return user settings', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);
      await createTestSettings(user.id, {
        primary_currency: 'USD',
        show_converted_totals: false,
        show_individual_currencies: false,
      });

      const settings = await userService.getSettings(user.id);

      expect(settings).toEqual({
        primaryCurrency: 'USD',
        showConvertedTotals: false,
        showIndividualCurrencies: false,
      });
    });

    it('should return default settings if none exist', async () => {
      const user = await createTestUser(testEmail1, testPassword, testName);

      const settings = await userService.getSettings(user.id);

      expect(settings).toEqual({
        primaryCurrency: 'IDR',
        showConvertedTotals: true,
        showIndividualCurrencies: true,
      });
    });

    it('should throw error for non-existent user', async () => {
      expect(userService.getSettings('non-existent-id')).rejects.toThrow();
    });

    it('should throw error with USER_NOT_FOUND code for non-existent user', async () => {
      expect(userService.getSettings('non-existent-id')).rejects.toMatchObject({
        code: ServiceErrorCode.USER_NOT_FOUND,
      });
    });
  });

  describe('Integration', () => {
    it('should complete full user profile flow', async () => {
      // Create user
      const user = await createTestUser(testEmail1, testPassword, testName);

      // Get default settings
      const settings1 = await userService.getSettings(user.id);
      expect(settings1.primaryCurrency).toBe('IDR');

      // Update settings
      const settings2 = await userService.updateSettings(user.id, {
        primaryCurrency: 'USD',
      });
      expect(settings2.primaryCurrency).toBe('USD');

      // Verify settings persisted
      const settings3 = await userService.getSettings(user.id);
      expect(settings3.primaryCurrency).toBe('USD');

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
