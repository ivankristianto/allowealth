/**
 * User Service
 *
 * Provides high-level user profile and settings operations.
 * Handles profile updates, password changes, and user preferences.
 *
 * Error codes:
 * - USER_NOT_FOUND: User doesn't exist
 * - EMAIL_ALREADY_EXISTS: Email owned by another user
 * - INVALID_PASSWORD: Old password doesn't match
 * - WEAK_PASSWORD: New password doesn't meet requirements
 * - VALIDATION_ERROR: Input validation failed
 */

import { users, userSettings, type IDatabase } from '@/db';
import { eq } from 'drizzle-orm';
import { verifyPassword, hashPassword } from '@/lib/auth/password';
import { z } from 'zod';
import { UserServiceError, ServiceErrorCode } from './service-errors';

/**
 * Zod schemas for user service validation
 */
export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  email: z.string().email('Invalid email format'),
});

export const updatePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(
      /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
      'Password must contain at least one number or special character'
    ),
});

export const updateSettingsSchema = z.object({
  primaryCurrency: z.enum(['IDR', 'USD'], {
    message: 'Currency must be either IDR or USD',
  }),
  showConvertedTotals: z.boolean().optional(),
  showIndividualCurrencies: z.boolean().optional(),
});

/**
 * Input types inferred from Zod schemas
 */
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

/**
 * User settings with defaults
 */
export type UserSettings = {
  primaryCurrency: 'IDR' | 'USD';
  showConvertedTotals: boolean;
  showIndividualCurrencies: boolean;
};

/**
 * Default user settings
 */
const DEFAULT_SETTINGS: UserSettings = {
  primaryCurrency: 'IDR',
  showConvertedTotals: true,
  showIndividualCurrencies: true,
};

/**
 * Constant-time delay function to prevent timing attacks
 * Always takes the same amount of time regardless of input
 */
function constantTimeDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * User Service
 */
export class UserService {
  /**
   * Create a new UserService with database injection
   * @param db - Database instance (injected for testability)
   */
  constructor(private db: IDatabase) {}

  /**
   * Update user profile (name and email)
   *
   * @param userId - User ID to update
   * @param input - Profile update data
   * @returns Promise resolving to updated user
   * @throws {UserServiceError} If user not found, email exists, or validation fails
   */
  async updateProfile(userId: string, input: UpdateProfileInput) {
    // Validate input using Zod schema
    const validated = updateProfileSchema.parse(input);

    // Check if user exists
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new UserServiceError(ServiceErrorCode.USER_NOT_FOUND, 'User not found', 404);
    }

    // If email is being changed, check if it's already taken
    if (validated.email.toLowerCase() !== user.email.toLowerCase()) {
      const existingUser = await this.db.query.users.findFirst({
        where: eq(users.email, validated.email.toLowerCase()),
      });

      if (existingUser) {
        throw new UserServiceError(
          ServiceErrorCode.EMAIL_ALREADY_EXISTS,
          'Email already exists',
          409
        );
      }
    }

    // Update user
    await this.db
      .update(users)
      .set({
        name: validated.name.trim(),
        email: validated.email.toLowerCase(),
        updated_at: new Date(),
      })
      .where(eq(users.id, userId));

    // Return updated user
    const updatedUser = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    return updatedUser!;
  }

  /**
   * Update user password
   *
   * @param userId - User ID to update
   * @param input - Password update data
   * @returns Promise resolving when password is updated
   * @throws {UserServiceError} If user not found, old password invalid, or new password weak
   */
  async updatePassword(userId: string, input: UpdatePasswordInput) {
    // Validate input using Zod schema (includes password strength validation)
    const validated = updatePasswordSchema.parse(input);

    // Check if user exists
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new UserServiceError(ServiceErrorCode.USER_NOT_FOUND, 'User not found', 404);
    }

    // Verify old password
    const isValidOldPassword = await verifyPassword(validated.oldPassword, user.password_hash);

    // Add constant-time delay to prevent timing attacks
    // This ensures the response time is the same regardless of whether the password is correct
    await constantTimeDelay(100);

    if (!isValidOldPassword) {
      throw new UserServiceError(ServiceErrorCode.INVALID_PASSWORD, 'Invalid old password', 401);
    }

    // Hash new password
    const newPasswordHash = await hashPassword(validated.newPassword);

    // Update password
    await this.db
      .update(users)
      .set({
        password_hash: newPasswordHash,
        updated_at: new Date(),
      })
      .where(eq(users.id, userId));

    return { success: true };
  }

  /**
   * Update user settings
   *
   * @param userId - User ID to update
   * @param input - Settings update data
   * @returns Promise resolving to updated settings
   * @throws {UserServiceError} If user not found or validation fails
   */
  async updateSettings(userId: string, input: UpdateSettingsInput) {
    // Validate input using Zod schema
    const validated = updateSettingsSchema.parse(input);

    // Check if user exists
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new UserServiceError(ServiceErrorCode.USER_NOT_FOUND, 'User not found', 404);
    }

    // Check if settings exist
    const existingSettings = await this.db.query.userSettings.findFirst({
      where: eq(userSettings.user_id, userId),
    });

    type UserSettingsUpdate = Partial<{
      primary_currency: 'IDR' | 'USD';
      show_converted_totals: boolean;
      show_individual_currencies: boolean;
      updated_at: Date;
    }>;

    const updateData: UserSettingsUpdate = {
      updated_at: new Date(),
    };

    if (validated.primaryCurrency !== undefined) {
      updateData.primary_currency = validated.primaryCurrency;
    }

    if (validated.showConvertedTotals !== undefined) {
      updateData.show_converted_totals = validated.showConvertedTotals;
    }

    if (validated.showIndividualCurrencies !== undefined) {
      updateData.show_individual_currencies = validated.showIndividualCurrencies;
    }

    if (existingSettings) {
      // Update existing settings
      await this.db.update(userSettings).set(updateData).where(eq(userSettings.user_id, userId));
    } else {
      // Create new settings
      await this.db.insert(userSettings).values({
        user_id: userId,
        primary_currency: validated.primaryCurrency,
        show_converted_totals:
          validated.showConvertedTotals ?? DEFAULT_SETTINGS.showConvertedTotals,
        show_individual_currencies:
          validated.showIndividualCurrencies ?? DEFAULT_SETTINGS.showIndividualCurrencies,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Return updated settings
    return this.getSettings(userId);
  }

  /**
   * Get user settings with defaults
   *
   * @param userId - User ID to get settings for
   * @returns Promise resolving to user settings with defaults applied
   */
  async getSettings(userId: string): Promise<UserSettings> {
    // Check if user exists
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new UserServiceError(ServiceErrorCode.USER_NOT_FOUND, 'User not found', 404);
    }

    // Get settings from database
    const settings = await this.db.query.userSettings.findFirst({
      where: eq(userSettings.user_id, userId),
    });

    if (!settings) {
      // Return defaults if no settings exist
      return { ...DEFAULT_SETTINGS };
    }

    // Return settings with defaults for any missing values
    return {
      primaryCurrency: settings.primary_currency as 'IDR' | 'USD',
      showConvertedTotals: settings.show_converted_totals ?? DEFAULT_SETTINGS.showConvertedTotals,
      showIndividualCurrencies:
        settings.show_individual_currencies ?? DEFAULT_SETTINGS.showIndividualCurrencies,
    };
  }
}
