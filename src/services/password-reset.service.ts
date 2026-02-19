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

import { type IDatabase, db, getActiveSchema } from '@/db/index';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';
import { getEnv } from '@/lib/env';
import { createTokenService } from './base/token.factory';

const log = createLogger('password-reset');

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
 * Validate email format
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate forgot password input
 */
function validateForgotPasswordInput(email: string): { valid: boolean; errors?: string[] } {
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
 * Get base URL from environment or use default
 */
function getBaseUrl(): string {
  return getEnv('PUBLIC_URL') || 'http://localhost:4321';
}

/**
 * Password Reset Service
 */
export class PasswordResetService {
  private tokens: ReturnType<typeof createTokenService>;

  constructor(private db: IDatabase) {
    this.tokens = createTokenService(db, {
      getTable: () => getActiveSchema().passwordResetTokens,
      getQuery: () => db.query.passwordResetTokens,
      getUserIdCol: () => getActiveSchema().passwordResetTokens.user_id,
      getTokenCol: () => getActiveSchema().passwordResetTokens.token,
      getExpiresAtCol: () => getActiveSchema().passwordResetTokens.expires_at,
    });
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
  async requestPasswordReset(email: string): Promise<void> {
    // Validate input
    const validation = validateForgotPasswordInput(email);
    if (!validation.valid) {
      throw new PasswordResetError(
        PASSWORD_RESET_ERRORS.INVALID_INPUT,
        validation.errors!.join(', ')
      );
    }

    try {
      const schema = getActiveSchema();

      // Find user by email
      const user = await this.db.query.users.findFirst({
        where: eq(schema.users.email, email.toLowerCase()),
      });

      // If user not found, return success anyway to prevent email enumeration
      if (!user) {
        log.warn('password reset requested for non-existent email');
        return;
      }

      const token = await this.tokens.createToken(user.id, 60); // 1 hour

      // Send password reset email
      const baseUrl = getBaseUrl();
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      try {
        await emailService.sendPasswordReset({
          to: email,
          resetUrl,
          expiresIn: '1 hour',
        });
      } catch (emailError) {
        log.error('email sending failed:', emailError);
      }
    } catch (error) {
      // Log error but return success to prevent email enumeration
      log.error('password reset request failed:', error);
    }
  }

  /**
   * Validate a password reset token
   *
   * @param token - Reset token to validate
   * @returns Promise resolving to user ID if valid, null otherwise
   */
  async validateResetToken(token: string): Promise<string | null> {
    if (!token || token.length === 0) {
      return null;
    }

    try {
      const result = await this.tokens.validateToken(token);
      return result?.userId ?? null;
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
  async consumeResetToken(token: string): Promise<void> {
    if (!token || token.length === 0) {
      return;
    }

    try {
      await this.tokens.consumeToken(token);
    } catch (error) {
      log.error('token consumption failed:', error);
    }
  }
}

// Backwards-compatible module-level exports (existing callers unchanged)
const _service = new PasswordResetService(db);
export const requestPasswordReset = _service.requestPasswordReset.bind(_service);
export const validateResetToken = _service.validateResetToken.bind(_service);
export const consumeResetToken = _service.consumeResetToken.bind(_service);
