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
import { db } from '@/db/index';
import { users, passwordResetTokens } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';

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
      where: eq(users.email, email.toLowerCase()),
    });

    // If user not found, return success anyway to prevent email enumeration
    if (!user) {
      // Log the attempt but don't throw error
      console.warn(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    // Generate secure token
    const token = nanoid(64); // 64-character secure token
    const tokenId = nanoid();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MS);

    // Delete any existing tokens for this user
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.user_id, user.id));

    // Create new reset token
    await db.insert(passwordResetTokens).values({
      id: tokenId,
      token,
      user_id: user.id,
      expires_at: expiresAt,
    });

    // TODO: Send email with reset link
    // This requires email service integration (Resend, SendGrid, AWS SES, etc.)
    // The email should contain a link to /reset-password?token={token}
    console.warn(`[TODO] Send password reset email to: ${email}`);
    console.warn(`[TODO] Reset link: /reset-password?token=${token}`);

    // For now, log the token (remove this in production)
    console.warn(`[DEV] Password reset token for ${email}: ${token}`);
  } catch (error) {
    // Log error but return success to prevent email enumeration
    console.error('[ERROR] Password reset request failed:', error);

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
        eq(passwordResetTokens.token, token),
        gt(passwordResetTokens.expires_at, new Date())
      ),
    });

    if (!resetToken) {
      return null;
    }

    return resetToken.user_id;
  } catch (error) {
    console.error('[ERROR] Token validation failed:', error);
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
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
  } catch (error) {
    console.error('[ERROR] Token consumption failed:', error);
  }
}
