import type { APIRoute } from 'astro';
import { errorResponse, successResponse } from '@/lib/api-utils';
import { invalidateMcpToken } from '@/lib/mcp-auth';
import { logError } from '@/lib/utils';
import { mcpAppPasswordService } from '@/services/mcp-app-password.service';
import { securityActivityService } from '@/services/security-activity.service';

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
    if (!revoked) return errorResponse('App password not found', 404, 'NOT_FOUND');

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
