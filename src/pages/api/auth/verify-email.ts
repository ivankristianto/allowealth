/**
 * GET /api/auth/verify-email
 *
 * Email Verification Endpoint
 *
 * Verifies email using token and redirects to login with status.
 * On success for admin users, activates workspace and seeds default categories.
 */

import type { APIRoute } from 'astro';
import { db } from '@/db';
import { session as authSession } from '@/db/schema/sqlite/better-auth';
import { EmailVerificationService } from '@/services/email-verification.service';
import { WorkspaceService } from '@/services/workspace.service';
import { AccountCategoryService } from '@/services/account-category.service';
import { createLogger } from '@/lib/logger';
import { eq } from 'drizzle-orm';

const log = createLogger('api:verify-email');

export const prerender = false;

export const GET: APIRoute = async ({ request, redirect }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    log.warn('Verification attempt without token');
    return redirect('/login?error=invalid_token', 302);
  }

  try {
    const emailVerificationService = new EmailVerificationService(db);
    const result = await emailVerificationService.verifyEmail(token);

    if (result.success === false) {
      const { error, email: userEmail } = result;

      if (error === 'TOKEN_EXPIRED') {
        log.warn('Expired token verification attempt');
        const emailParam = userEmail ? `&email=${encodeURIComponent(userEmail)}` : '';
        return redirect(`/login?error=expired_token${emailParam}`, 302);
      }

      if (error === 'INVALID_TOKEN') {
        log.warn('Invalid token verification attempt');
        return redirect('/login?error=invalid_token', 302);
      }

      if (error === 'EMAIL_ALREADY_EXISTS') {
        log.warn('Email change failed - email claimed by another user');
        return redirect('/login?error=email_taken', 302);
      }

      log.error('Email verification failed', { error });
      return redirect('/login?error=verification_failed', 302);
    }

    const user = result.user;

    // Handle email change verification by forcing re-authentication everywhere.
    if (result.emailChanged) {
      await db.delete(authSession).where(eq(authSession.userId, user.id));

      log.info('Email changed, all sessions invalidated', { userId: user.id });
      return redirect('/login?email-changed=true', 302);
    }

    // If user is workspace owner (admin role), activate workspace and seed categories
    if (user.role === 'admin') {
      try {
        const workspaceService = new WorkspaceService(db);
        await workspaceService.activateWorkspace(user.workspace_id);

        const accountCategoryService = new AccountCategoryService(db);
        await accountCategoryService.seedDefaultCategories(user.workspace_id, user.id);

        log.info('Workspace activated and categories seeded', {
          userId: user.id,
          workspaceId: user.workspace_id,
        });
      } catch (activationError) {
        // Don't fail verification if activation fails - user can still login
        log.error('Failed to activate workspace after verification', {
          userId: user.id,
          error: activationError,
        });
      }
    }

    log.info('Email verified successfully', { userId: user.id });
    return redirect('/login?verified=true', 302);
  } catch (error) {
    log.error('Unexpected error during email verification', { error });
    return redirect('/login?error=verification_failed', 302);
  }
};
