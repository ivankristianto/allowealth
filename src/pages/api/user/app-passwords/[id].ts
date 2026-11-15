import type { APIRoute } from 'astro';
import { errorResponse, isValidationError, successResponse, validateBody } from '@/lib/api-utils';
import { isDemoMode } from '@/lib/demo-mode';
import { logError } from '@/lib/logger';
import { APP_PASSWORD_WRITE_RATE_LIMIT, isRecentSignIn } from '@/lib/mcp-app-password';
import { invalidateMcpToken } from '@/lib/mcp-auth';
import { checkRateLimitByKey, createRateLimitResponse } from '@/lib/rate-limit';
import { updateAppPasswordSchema } from '@/lib/validation/app-passwords';
import { mcpAppPasswordService } from '@/services/mcp-app-password.service';
import { securityActivityService } from '@/services/security-activity.service';

function notFound(): Response {
  return errorResponse('App password not found', 404, 'NOT_FOUND');
}

/**
 * GET /api/user/app-passwords/:id
 * Returns one of the current user's app passwords.
 */
export const GET: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user?.id) return errorResponse('Unauthorized', 401);

  const id = context.params.id;
  if (!id) return errorResponse('Missing app password id', 400);

  try {
    const appPassword = await mcpAppPasswordService.findForUser(user.id, id);
    if (!appPassword) return notFound();
    return successResponse({ appPassword });
  } catch (error) {
    const errorId = logError('Failed to load app password', error);
    return errorResponse('Failed to load app password', 500, 'INTERNAL_ERROR', { errorId });
  }
};

/**
 * PATCH /api/user/app-passwords/:id
 * Renames one of the current user's app passwords or changes its permissions. Needs a recent sign-in.
 */
export const PATCH: APIRoute = async (context) => {
  const user = context.locals.user;
  const session = context.locals.session;
  if (!user?.id || !session) return errorResponse('Unauthorized', 401);
  if (isDemoMode()) return errorResponse('App passwords are disabled in demo mode', 403);

  if (!isRecentSignIn(session.createdAt)) {
    return errorResponse(
      'Sign in again to change an app password. This needs a sign-in from the last 15 minutes.',
      403,
      'REAUTH_REQUIRED'
    );
  }

  const id = context.params.id;
  if (!id) return errorResponse('Missing app password id', 400);

  const rateLimit = checkRateLimitByKey(
    `app-password-update:${user.id}`,
    APP_PASSWORD_WRITE_RATE_LIMIT
  );
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit, 'Too many app password changes. Try again later.');
  }

  const validation = await validateBody(context.request, updateAppPasswordSchema);
  if (isValidationError(validation)) {
    return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
  }

  try {
    const updated = await mcpAppPasswordService.update(user.id, id, validation.data);
    if (!updated) return notFound();

    const { before, after } = updated;
    await securityActivityService.logEvent({
      type: 'app_password_updated',
      userId: user.id,
      entityId: after.id,
      oldValue: { name: before.name, permissions: before.permissions },
      newValue: { name: after.name, permissions: after.permissions },
    });

    return successResponse({ appPassword: after });
  } catch (error) {
    const errorId = logError('Failed to update app password', error);
    return errorResponse('Failed to update app password', 500, 'INTERNAL_ERROR', { errorId });
  }
};

/**
 * DELETE /api/user/app-passwords/:id
 * Revokes one of the current user's app passwords. It stops working immediately.
 */
export const DELETE: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user?.id) return errorResponse('Unauthorized', 401);

  const id = context.params.id;
  if (!id) return errorResponse('Missing app password id', 400);

  try {
    const revoked = await mcpAppPasswordService.revoke(user.id, id);
    if (!revoked) return notFound();

    await invalidateMcpToken(revoked.id);
    await securityActivityService.logEvent({
      type: 'app_password_revoked',
      userId: user.id,
      entityId: revoked.id,
      oldValue: { name: revoked.name },
    });

    return successResponse({ id: revoked.id });
  } catch (error) {
    logError('Failed to revoke app password', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to revoke app password',
      500
    );
  }
};
