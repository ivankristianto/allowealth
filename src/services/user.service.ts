/**
 * User Service
 *
 * Provides high-level user profile operations.
 * Handles profile updates and password changes.
 *
 * Note: User settings (currency, display preferences) are now handled by
 * UserMetaService via the user_meta table.
 *
 * Error codes:
 * - USER_NOT_FOUND: User doesn't exist
 * - EMAIL_ALREADY_EXISTS: Email owned by another user
 * - INVALID_PASSWORD: Old password doesn't match
 * - WEAK_PASSWORD: New password doesn't meet requirements
 * - VALIDATION_ERROR: Input validation failed
 */

import { type IDatabase, getActiveSchema } from '@/db';
import { eq } from 'drizzle-orm';
import { verifyPassword, hashPassword } from '@/lib/auth/password';
import { z } from 'zod';
import { UserServiceError, ServiceErrorCode } from './service-errors';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS,
  PASSWORD_ERROR_MESSAGES,
} from '@/lib/validation';

/**
 * Zod schemas for user service validation
 */
export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'),
});

export const updatePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z
    .string()
    .min(PASSWORD_MIN_LENGTH, PASSWORD_ERROR_MESSAGES.minLength)
    .regex(PASSWORD_REQUIREMENTS.hasLetter, PASSWORD_ERROR_MESSAGES.hasLetter)
    .regex(PASSWORD_REQUIREMENTS.hasNumberOrSpecial, PASSWORD_ERROR_MESSAGES.hasNumberOrSpecial),
});

/**
 * Input types inferred from Zod schemas
 */
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

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
  private schema = getActiveSchema();

  /**
   * Create a new UserService with database injection
   * @param db - Database instance (injected for testability)
   */
  constructor(private db: IDatabase) {}

  /**
   * Get user by ID
   *
   * @param userId - User ID to look up
   * @returns Promise resolving to user or null if not found
   */
  async getById(userId: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(this.schema.users.id, userId),
    });

    return user ?? null;
  }

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
      where: eq(this.schema.users.id, userId),
    });

    if (!user) {
      throw new UserServiceError(ServiceErrorCode.USER_NOT_FOUND, 'User not found', 404);
    }

    // If email is being changed, check if it's already taken
    if (validated.email.toLowerCase() !== user.email.toLowerCase()) {
      const existingUser = await this.db.query.users.findFirst({
        where: eq(this.schema.users.email, validated.email.toLowerCase()),
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
      .update(this.schema.users)
      .set({
        name: validated.name.trim(),
        email: validated.email.toLowerCase(),
        updated_at: new Date(),
      })
      .where(eq(this.schema.users.id, userId));

    // Return updated user
    const updatedUser = await this.db.query.users.findFirst({
      where: eq(this.schema.users.id, userId),
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
      where: eq(this.schema.users.id, userId),
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
      throw new UserServiceError(ServiceErrorCode.INVALID_PASSWORD, 'Invalid old password', 400);
    }

    // Hash new password
    const newPasswordHash = await hashPassword(validated.newPassword);

    // Update password
    await this.db
      .update(this.schema.users)
      .set({
        password_hash: newPasswordHash,
        updated_at: new Date(),
      })
      .where(eq(this.schema.users.id, userId));

    return { success: true };
  }

  /**
   * Soft delete a user by setting deleted_at timestamp
   *
   * @param userId - User ID to soft delete
   * @throws {UserServiceError} If user not found
   */
  async softDelete(userId: string): Promise<void> {
    // Check if user exists
    const user = await this.db.query.users.findFirst({
      where: eq(this.schema.users.id, userId),
    });

    if (!user) {
      throw new UserServiceError(ServiceErrorCode.USER_NOT_FOUND, 'User not found', 404);
    }

    // If already deleted, just return
    if (user.deleted_at !== null) {
      return;
    }

    // Soft delete user
    await this.db
      .update(this.schema.users)
      .set({
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(this.schema.users.id, userId));
  }
}
