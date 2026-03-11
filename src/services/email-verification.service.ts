/**
 * Email Verification Service
 *
 * Manages email verification tokens for user registration.
 * Tokens expire after 24 hours and are single-use.
 */

import { type IDatabase, getActiveSchema } from '@/db';
import { createLogger } from '@/lib/logger';
import { getEnv } from '@/lib/env';
import { hashOpaqueToken } from '@/lib/crypto/token-hash';
import { and, eq } from 'drizzle-orm';
import type { EmailService } from '@/services/email';
import type { users } from '@/db/schema/sqlite/users';
import { USER_META_KEYS } from '@/lib/constants/user-meta-keys';
import { nanoid } from 'nanoid';
import { createTokenService } from './base/token.factory';
import { ServiceErrorCode, UserServiceError } from './service-errors';
import type { UserMetaService } from './user-meta.service';

const log = createLogger('email-verification');

type UserRecord = typeof users.$inferSelect;

function isUniqueConstraintError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  return (
    code === '23505' ||
    message.includes('UNIQUE constraint failed') ||
    message.includes('duplicate key value violates unique constraint')
  );
}

export type VerifyEmailResult =
  | { success: true; user: UserRecord; emailChanged?: boolean }
  | { success: false; error: string; email?: string };

export class EmailVerificationService {
  private get schema() {
    return getActiveSchema();
  }

  private tokens: ReturnType<typeof createTokenService>;

  constructor(
    private db: IDatabase,
    private emailSvc?: EmailService,
    private userMetaSvc?: UserMetaService
  ) {
    this.tokens = createTokenService(db, {
      getTable: () => getActiveSchema().emailVerificationTokens,
      getQuery: () => db.query.emailVerificationTokens,
      getUserIdCol: () => getActiveSchema().emailVerificationTokens.user_id,
      getTokenCol: () => getActiveSchema().emailVerificationTokens.token,
      getExpiresAtCol: () => getActiveSchema().emailVerificationTokens.expires_at,
    });
  }

  /**
   * Create verification token for user
   * @param userId - User ID to create token for
   * @returns Generated token string
   */
  async createVerificationToken(userId: string): Promise<string> {
    const token = await this.tokens.createToken(userId, 24 * 60); // 24 hours
    log.info('Created verification token for user', { userId });
    return token;
  }

  /**
   * Get pending email change value for a user
   */
  async getPendingEmailChange(userId: string): Promise<string | null> {
    if (this.userMetaSvc) {
      try {
        const value = await this.userMetaSvc.getUserMeta(userId, USER_META_KEYS.PENDING_EMAIL);
        return value && value.length > 0 ? value : null;
      } catch {
        return null;
      }
    }

    const meta = await this.db.query.userMeta.findFirst({
      where: and(
        eq(this.schema.userMeta.user_id, userId),
        eq(this.schema.userMeta.meta_key, USER_META_KEYS.PENDING_EMAIL)
      ),
    });

    return meta?.meta_value && meta.meta_value.length > 0 ? meta.meta_value : null;
  }

  /**
   * Request an email change flow for an existing user.
   */
  async requestEmailChange(userId: string, newEmail: string): Promise<void> {
    const normalizedEmail = newEmail.trim().toLowerCase();

    const user = await this.db.query.users.findFirst({
      where: eq(this.schema.users.id, userId),
    });

    if (!user) {
      throw new UserServiceError(ServiceErrorCode.USER_NOT_FOUND, 'User not found', 404);
    }

    if (normalizedEmail === user.email.toLowerCase()) {
      await this.clearPendingEmailAndTokens(userId);
      return;
    }

    const existingUser = await this.db.query.users.findFirst({
      where: eq(this.schema.users.email, normalizedEmail),
    });

    if (existingUser && existingUser.id !== userId) {
      throw new UserServiceError(
        ServiceErrorCode.EMAIL_ALREADY_EXISTS,
        'Email already exists',
        409
      );
    }

    const existingAuthUser = await this.db.query.user.findFirst({
      where: eq(this.schema.user.email, normalizedEmail),
    });

    if (existingAuthUser && existingAuthUser.id !== userId) {
      throw new UserServiceError(
        ServiceErrorCode.EMAIL_ALREADY_EXISTS,
        'Email already exists',
        409
      );
    }

    if (this.userMetaSvc) {
      await this.userMetaSvc.setUserMeta(userId, USER_META_KEYS.PENDING_EMAIL, normalizedEmail);
    } else {
      await this.db
        .insert(this.schema.userMeta)
        .values({
          meta_id: nanoid(),
          user_id: userId,
          meta_key: USER_META_KEYS.PENDING_EMAIL,
          meta_value: normalizedEmail,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .onConflictDoUpdate({
          target: [this.schema.userMeta.user_id, this.schema.userMeta.meta_key],
          set: {
            meta_value: normalizedEmail,
            updated_at: new Date(),
          },
        });
    }

    const token = await this.createVerificationToken(userId);

    if (this.emailSvc) {
      const baseUrl = getEnv('PUBLIC_URL') || 'http://localhost:4321';
      const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

      await this.emailSvc.sendEmailChangeVerification({
        to: normalizedEmail,
        userName: user.name,
        newEmail: normalizedEmail,
        verificationUrl,
      });
    }

    log.info('Email change requested', { userId, newEmail: normalizedEmail });
  }

  async clearPendingEmailAndTokens(userId: string): Promise<void> {
    await this.db
      .delete(this.schema.userMeta)
      .where(
        and(
          eq(this.schema.userMeta.user_id, userId),
          eq(this.schema.userMeta.meta_key, USER_META_KEYS.PENDING_EMAIL)
        )
      );

    await this.db
      .delete(this.schema.emailVerificationTokens)
      .where(eq(this.schema.emailVerificationTokens.user_id, userId));
  }

  /**
   * Resend verification email for a pending email change.
   * Creates a new token and sends the email change verification to the pending address.
   * Does NOT re-unlink OAuth accounts (already done on initial request).
   */
  async resendEmailChangeVerification(userId: string): Promise<{ pendingEmail: string }> {
    const pendingEmail = await this.getPendingEmailChange(userId);

    if (!pendingEmail) {
      throw new UserServiceError(
        ServiceErrorCode.VALIDATION_ERROR,
        'No pending email change found',
        400
      );
    }

    const user = await this.db.query.users.findFirst({
      where: eq(this.schema.users.id, userId),
    });

    if (!user) {
      throw new UserServiceError(ServiceErrorCode.USER_NOT_FOUND, 'User not found', 404);
    }

    if (!this.emailSvc) {
      log.warn('No email service configured, skipping verification email');
      throw new UserServiceError(
        ServiceErrorCode.VALIDATION_ERROR,
        'Email service not available',
        503
      );
    }

    // Delete old tokens and create a fresh one
    await this.db
      .delete(this.schema.emailVerificationTokens)
      .where(eq(this.schema.emailVerificationTokens.user_id, userId));

    const token = await this.createVerificationToken(userId);

    const baseUrl = getEnv('PUBLIC_URL') || 'http://localhost:4321';
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

    await this.emailSvc.sendEmailChangeVerification({
      to: pendingEmail,
      userName: user.name,
      newEmail: pendingEmail,
      verificationUrl,
    });

    log.info('Email change verification resent', { userId, pendingEmail });
    return { pendingEmail };
  }

  /**
   * Send verification email to user
   * @param userId - User ID
   */
  async sendVerificationEmail(userId: string, baseUrl?: string): Promise<void> {
    // Validate user and email service before creating token
    const user = await this.db.query.users.findFirst({
      where: eq(this.schema.users.id, userId),
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.deleted_at) {
      log.warn('Skipping verification email for soft-deleted user', { userId });
      return;
    }

    if (!this.emailSvc) {
      log.warn('No email service configured, skipping verification email');
      return;
    }

    // Create token only after validating user and email service
    const token = await this.createVerificationToken(userId);

    // Build verification URL — PUBLIC_URL (trusted config) takes precedence over request origin
    const resolvedBaseUrl = getEnv('PUBLIC_URL') || baseUrl || 'http://localhost:4321';
    const verificationUrl = `${resolvedBaseUrl}/api/auth/verify-email?token=${token}`;

    // Send email via workspace email service
    await this.emailSvc.sendEmailVerification({
      to: user.email,
      userName: user.name,
      verificationUrl,
    });

    log.info('Verification email sent', { userId });
  }

  /**
   * Verify email using token
   * @param token - Verification token from email
   * @returns Result with user or error
   */
  async verifyEmail(token: string): Promise<VerifyEmailResult> {
    const tokenHash = await hashOpaqueToken(token);

    // Look up token
    const tokenRecord = await this.db.query.emailVerificationTokens.findFirst({
      where: eq(this.schema.emailVerificationTokens.token, tokenHash),
    });

    if (!tokenRecord) {
      log.warn('Invalid verification token attempted');
      return { success: false, error: 'INVALID_TOKEN' };
    }

    const { user_id: userId, expires_at: expiresAt } = tokenRecord;

    // Check expiration
    if (expiresAt < new Date()) {
      log.warn('Expired verification token attempted', { userId });

      // Clean up expired token
      await this.db
        .delete(this.schema.emailVerificationTokens)
        .where(eq(this.schema.emailVerificationTokens.token, tokenHash));

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

    // Block verification for soft-deleted users
    if (user.deleted_at) {
      log.warn('Verification attempted for soft-deleted user', { userId });
      return { success: false, error: 'INVALID_TOKEN' };
    }

    const pendingEmail = await this.getPendingEmailChange(userId);

    if (pendingEmail) {
      const [emailTaken, authEmailTaken, authUserRecord] = await Promise.all([
        this.db.query.users.findFirst({
          where: eq(this.schema.users.email, pendingEmail),
        }),
        this.db.query.user.findFirst({
          where: eq(this.schema.user.email, pendingEmail),
        }),
        this.db.query.user.findFirst({
          where: eq(this.schema.user.id, userId),
        }),
      ]);

      if (
        (emailTaken && emailTaken.id !== userId) ||
        (authEmailTaken && authEmailTaken.id !== userId)
      ) {
        log.warn('Pending email claimed by another user', { userId, pendingEmail });
        await this.clearPendingEmailAndTokens(userId);
        return { success: false, error: 'EMAIL_ALREADY_EXISTS' };
      }

      if (!authUserRecord) {
        log.error('Better Auth user not found for email change verification', { userId });
        return { success: false, error: 'USER_NOT_FOUND' };
      }

      const verifiedAt = new Date();
      const updatedAt = new Date();
      try {
        await this.db
          .update(this.schema.user)
          .set({
            email: pendingEmail,
            emailVerified: true,
            updatedAt,
          })
          .where(eq(this.schema.user.id, userId));

        await this.db
          .update(this.schema.users)
          .set({
            email: pendingEmail,
            email_verified_at: verifiedAt,
            updated_at: updatedAt,
          })
          .where(eq(this.schema.users.id, userId));
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          log.warn('Pending email claimed during update', { userId, pendingEmail });
          await this.clearPendingEmailAndTokens(userId);
          return { success: false, error: 'EMAIL_ALREADY_EXISTS' };
        }
        throw error;
      }

      await this.db
        .delete(this.schema.userMeta)
        .where(
          and(
            eq(this.schema.userMeta.user_id, userId),
            eq(this.schema.userMeta.meta_key, USER_META_KEYS.PENDING_EMAIL)
          )
        );

      await this.db
        .delete(this.schema.emailVerificationTokens)
        .where(eq(this.schema.emailVerificationTokens.user_id, userId));

      log.info('Email changed via verification', { userId, newEmail: pendingEmail });

      const updatedUser = {
        ...user,
        email: pendingEmail,
        email_verified_at: verifiedAt,
        updated_at: updatedAt,
      };
      return { success: true, user: updatedUser, emailChanged: true };
    }

    // Check if already verified (idempotent) — clean up leftover tokens
    if (user.email_verified_at) {
      log.info('User already verified', { userId });
      await this.db
        .delete(this.schema.emailVerificationTokens)
        .where(eq(this.schema.emailVerificationTokens.user_id, userId));
      return { success: true, user };
    }

    // Mark user as verified (use single timestamp for both DB and response)
    const verifiedAt = new Date();
    await this.db
      .update(this.schema.users)
      .set({ email_verified_at: verifiedAt })
      .where(eq(this.schema.users.id, userId));

    // Delete all verification tokens for this user
    await this.db
      .delete(this.schema.emailVerificationTokens)
      .where(eq(this.schema.emailVerificationTokens.user_id, userId));

    log.info('Email verified successfully', { userId });

    const verifiedUser = { ...user, email_verified_at: verifiedAt };
    return { success: true, user: verifiedUser };
  }
}
