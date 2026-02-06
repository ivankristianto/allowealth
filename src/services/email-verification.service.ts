/**
 * Email Verification Service
 *
 * Manages email verification tokens for user registration.
 * Tokens expire after 24 hours and are single-use.
 */

import { type IDatabase, getActiveSchema } from '@/db';
import { createLogger } from '@/lib/logger';
import { getEnv } from '@/lib/env';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import type { EmailService } from '@/services/email';

const log = createLogger('email-verification');

export type VerifyEmailResult =
  | { success: true; user: any }
  | { success: false; error: string; email?: string };

export class EmailVerificationService {
  private schema = getActiveSchema();

  constructor(
    private db: IDatabase,
    private emailSvc?: EmailService
  ) {}

  /**
   * Create verification token for user
   * @param userId - User ID to create token for
   * @returns Generated token string
   */
  async createVerificationToken(userId: string): Promise<string> {
    const token = nanoid(64);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.db.insert(this.schema.emailVerificationTokens).values({
      id: nanoid(),
      user_id: userId,
      token,
      expires_at: expiresAt,
    });

    log.info('Created verification token for user', { userId });
    return token;
  }

  /**
   * Send verification email to user
   * @param userId - User ID
   */
  async sendVerificationEmail(userId: string): Promise<void> {
    const token = await this.createVerificationToken(userId);

    // Get user details
    const user = await this.db.query.users.findFirst({
      where: eq(this.schema.users.id, userId),
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Build verification URL
    const baseUrl = getEnv('PUBLIC_URL') || 'http://localhost:4321';
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

    if (!this.emailSvc) {
      log.warn('No email service configured, skipping verification email');
      return;
    }

    // Send email via workspace email service
    await this.emailSvc.sendEmailVerification(user.workspace_id, {
      to: user.email,
      userName: user.name,
      verificationUrl,
    });

    log.info('Verification email sent', { userId, email: user.email });
  }

  /**
   * Verify email using token
   * @param token - Verification token from email
   * @returns Result with user or error
   */
  async verifyEmail(token: string): Promise<VerifyEmailResult> {
    // Look up token
    const tokenRecord = await this.db.query.emailVerificationTokens.findFirst({
      where: eq(this.schema.emailVerificationTokens.token, token),
    });

    if (!tokenRecord) {
      log.warn('Invalid verification token attempted');
      return { success: false, error: 'INVALID_TOKEN' };
    }

    const { user_id: userId, expires_at: expiresAt } = tokenRecord;

    // Check expiration
    if (expiresAt < new Date()) {
      log.warn('Expired verification token attempted', { userId });

      // Get user email for resend functionality
      const userRecord = await this.db.query.users.findFirst({
        where: eq(this.schema.users.id, userId),
      });

      return {
        success: false,
        error: 'TOKEN_EXPIRED',
        email: userRecord?.email,
      };
    }

    // Get user
    const user = await this.db.query.users.findFirst({
      where: eq(this.schema.users.id, userId),
    });

    if (!user) {
      log.error('User not found for verification token', { userId });
      return { success: false, error: 'USER_NOT_FOUND' };
    }

    // Check if already verified (idempotent)
    if (user.email_verified_at) {
      log.info('User already verified', { userId });
      return { success: true, user };
    }

    // Mark user as verified
    await this.db
      .update(this.schema.users)
      .set({ email_verified_at: new Date() })
      .where(eq(this.schema.users.id, userId));

    // Delete all verification tokens for this user
    await this.db
      .delete(this.schema.emailVerificationTokens)
      .where(eq(this.schema.emailVerificationTokens.user_id, userId));

    log.info('Email verified successfully', { userId });

    const verifiedUser = { ...user, email_verified_at: new Date() };
    return { success: true, user: verifiedUser };
  }
}
