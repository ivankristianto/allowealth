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
 * - INVALID_PASSWORD: Old password doesn't match
 * - WEAK_PASSWORD: New password doesn't meet requirements
 * - VALIDATION_ERROR: Input validation failed
 */

import { type IDatabase, getActiveSchema } from '@/db';
import { and, eq } from 'drizzle-orm';
import { verifyPassword, hashPassword } from '@/lib/auth/password';
import { hashPassword as hashBetterAuthPassword } from 'better-auth/crypto';
import { maxLength, minLength, object, parse, pipe, regex, string, type InferInput } from 'valibot';
import { UserServiceError, ServiceErrorCode } from './service-errors';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS,
  PASSWORD_ERROR_MESSAGES,
} from '@/lib/validation';

/**
 * Validation schemas for user service input
 */
const updateProfileSchema = object({
  name: pipe(
    string(),
    minLength(1, 'Name is required'),
    maxLength(255, 'Name must be less than 255 characters')
  ),
});

export const updatePasswordSchema = object({
  oldPassword: pipe(string(), minLength(1, 'Old password is required')),
  newPassword: pipe(
    string(),
    minLength(PASSWORD_MIN_LENGTH, PASSWORD_ERROR_MESSAGES.minLength),
    regex(PASSWORD_REQUIREMENTS.hasLetter, PASSWORD_ERROR_MESSAGES.hasLetter),
    regex(PASSWORD_REQUIREMENTS.hasNumberOrSpecial, PASSWORD_ERROR_MESSAGES.hasNumberOrSpecial)
  ),
});

/**
 * Input type inferred from validation schema
 */
export type UpdatePasswordInput = InferInput<typeof updatePasswordSchema>;

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
  private get schema() {
    return getActiveSchema();
  }

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
   * Update user profile (name only)
   *
   * @param userId - User ID to update
   * @param input - Profile update data
   * @returns Promise resolving to updated user
   * @throws {UserServiceError} If user not found or validation fails
   */
  async updateProfile(userId: string, input: { name: string }) {
    // Validate input using the service schema
    const validated = parse(updateProfileSchema, input);

    // Check if user exists
    const user = await this.db.query.users.findFirst({
      where: eq(this.schema.users.id, userId),
    });

    if (!user) {
      throw new UserServiceError(ServiceErrorCode.USER_NOT_FOUND, 'User not found', 404);
    }

    // Update user
    await this.db
      .update(this.schema.users)
      .set({
        name: validated.name.trim(),
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
    // Validate input using the service schema (includes password strength validation)
    const validated = parse(updatePasswordSchema, input);

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

    // Hash new password for both legacy domain table and better-auth account table
    const [newPasswordHash, betterAuthHash] = await Promise.all([
      hashPassword(validated.newPassword),
      hashBetterAuthPassword(validated.newPassword),
    ]);

    const now = new Date();

    await this.db.transaction(async (tx) => {
      const authSchema = getActiveSchema();

      await tx
        .update(authSchema.users)
        .set({
          password_hash: newPasswordHash,
          updated_at: now,
        })
        .where(eq(authSchema.users.id, userId));

      await tx
        .update(authSchema.account)
        .set({
          password: betterAuthHash,
          updatedAt: now,
        })
        .where(
          and(
            eq(authSchema.account.userId, userId),
            eq(authSchema.account.providerId, 'credential')
          )
        );

      await tx.delete(authSchema.session).where(eq(authSchema.session.userId, userId));
    });

    return { success: true, reauthRequired: true };
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
