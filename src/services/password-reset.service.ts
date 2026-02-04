/**
 * Password Reset Service
 *
 * Handles password reset token generation, validation, and management.
 * Tokens expire after 1 hour for security.
 *
 * Error codes:
 * - USER_NOT_FOUND: Email not found in system
 * - INVALID_INPUT: Input validation failed
 * - TOKEN_INVALID: Token does not exist or expired
 * - DATABASE_ERROR: Database operation failed
 * - EMAIL_ERROR: Failed to send email
 */

import { nanoid } from 'nanoid';
import { db, getActiveSchema } from '@/db/index';
import { eq, and, gt } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const log = createLogger('password-reset');

// Get the correct schema for the current database dialect
const schema = getActiveSchema();
import { emailService } from '@/services';

/**
 * Error codes for password reset operations
 */
export const PASSWORD_RESET_ERRORS = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_INPUT: 'INVALID_INPUT',
  TOKEN_INVALID: 'TOKEN_INVALID',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EMAIL_ERROR: 'EMAIL_ERROR',
} as const;

/**
 * Password reset error class
 */
export class PasswordResetError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'PasswordResetError';
  }
}

/**
 * Input validation result
 */
interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Validate email format
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate forgot password input
 */
function validateForgotPasswordInput(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email || !validateEmail(email)) {
    errors.push('Valid email is required');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Token expiration time in milliseconds (1 hour)
 */
const TOKEN_EXPIRATION_MS = 60 * 60 * 1000;

/**
 * Get base URL from environment or use default
 *
 * Note: Uses import.meta.env because Astro/Vite only populates
 * import.meta.env from .env files, not process.env.
 */
function getBaseUrl(): string {
  return (
    import.meta.env.PUBLIC_BASE_URL ||
    import.meta.env.PUBLIC_API_URL?.replace('/api', '') ||
    'http://localhost:4321'
  );
}

/**
 * Request a password reset
 *
 * This function always returns success to prevent email enumeration attacks.
 * If the email doesn't exist, it will still return success but won't send an email.
 *
 * @param email - User email address
 * @returns Promise resolving when reset request is processed
 * @throws {PasswordResetError} If input is invalid
 */
export async function requestPasswordReset(email: string): Promise<void> {
  // Validate input
  const validation = validateForgotPasswordInput(email);
  if (!validation.valid) {
    throw new PasswordResetError(
      PASSWORD_RESET_ERRORS.INVALID_INPUT,
      validation.errors!.join(', ')
    );
  }

  try {
    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email.toLowerCase()),
    });

    // If user not found, return success anyway to prevent email enumeration
    if (!user) {
      // Log the attempt but don't throw error
      log.warn(`password reset requested for non-existent email: ${email}`);
      return;
    }

    // Generate secure token
    const token = nanoid(64); // 64-character secure token
    const tokenId = nanoid();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MS);

    // Delete any existing tokens for this user
    await db
      .delete(schema.passwordResetTokens)
      .where(eq(schema.passwordResetTokens.user_id, user.id));

    // Create new reset token
    await db.insert(schema.passwordResetTokens).values({
      id: tokenId,
      token,
      user_id: user.id,
      expires_at: expiresAt,
    });

    // Send password reset email
    const baseUrl = getBaseUrl();
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    try {
      await emailService.sendPasswordReset(user.workspace_id, {
        to: email,
        resetUrl,
        expiresIn: '1 hour',
      });
    } catch (emailError) {
      // Log email error but don't fail the request
      // (console fallback will have already logged it)
      log.error('email sending failed:', emailError);
    }
  } catch (error) {
    // Log error but return success to prevent email enumeration
    log.error('password reset request failed:', error);

    // Don't throw error to prevent email enumeration
    // In production, you might want to monitor these errors
  }
}

/**
 * Validate a password reset token
 *
 * @param token - Reset token to validate
 * @returns Promise resolving to user ID if valid, null otherwise
 */
export async function validateResetToken(token: string): Promise<string | null> {
  if (!token || token.length === 0) {
    return null;
  }

  try {
    // Find token that hasn't expired
    const resetToken = await db.query.passwordResetTokens.findFirst({
      where: and(
        eq(schema.passwordResetTokens.token, token),
        gt(schema.passwordResetTokens.expires_at, new Date())
      ),
    });

    if (!resetToken) {
      return null;
    }

    return resetToken.user_id;
  } catch (error) {
    log.error('token validation failed:', error);
    return null;
  }
}

/**
 * Consume a password reset token
 *
 * Deletes the token after it has been used for password reset.
 *
 * @param token - Reset token to consume
 * @returns Promise resolving when token is deleted
 */
export async function consumeResetToken(token: string): Promise<void> {
  if (!token || token.length === 0) {
    return;
  }

  try {
    await db.delete(schema.passwordResetTokens).where(eq(schema.passwordResetTokens.token, token));
  } catch (error) {
    log.error('token consumption failed:', error);
  }
}
