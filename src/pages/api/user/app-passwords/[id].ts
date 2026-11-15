import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { errorResponse, isValidationError, successResponse, validateBody } from '@/lib/api-utils';
import {
  HTML_RENDER_REQUEST_REQUIRED_MESSAGE,
  createRenderHelper,
  isRejectedHtmlRenderRequest,
} from '@/lib/api/renderResponse';
import { logError } from '@/lib/logger';
import { refuseAppPasswordWrite } from '@/lib/app-password-write-guard';
import { isRecentSignIn } from '@/lib/mcp-app-password';
import { invalidateMcpToken } from '@/lib/mcp-auth';
import { updateAppPasswordSchema } from '@/lib/validation/app-passwords';
import { categoryService } from '@/services';
import { AppPasswordError, mcpAppPasswordService } from '@/services/mcp-app-password.service';
import { securityActivityService } from '@/services/security-activity.service';
import SecurityAppPasswordEditPartial from '@/components/partials/SecurityAppPasswordEditPartial.astro';

function notFound(): Response {
  return errorResponse('App password not found', 404, 'NOT_FOUND');
}

/**
 * GET /api/user/app-passwords/:id
 * Returns one of the current user's app passwords. ?_render=html returns its edit form.
 */
export const GET: APIRoute = async (context) => {
  const render = createRenderHelper(context.url, context.request);
  if (isRejectedHtmlRenderRequest(context.url, context.request)) {
    return render.error(HTML_RENDER_REQUEST_REQUIRED_MESSAGE, 403);
  }

  const user = context.locals.user;
  if (!user?.id) return errorResponse('Unauthorized', 401);

  const id = context.params.id;
  if (!id) return errorResponse('Missing app password id', 400);

  try {
    const appPassword = await mcpAppPasswordService.findForUser(user.id, id);
    if (!appPassword) return notFound();

    if (render.wantsHtml()) {
      const session = context.locals.session;
      const categories = user.workspaceId ? await categoryService.findAll(user.workspaceId) : [];
      const container = await AstroContainer.create();
      const html = await container.renderToString(SecurityAppPasswordEditPartial, {
        props: {
          appPassword,
          recentSignIn: Boolean(session && isRecentSignIn(session.createdAt)),
          categories,
        },
      });
      return render.html(html);
    }

    return successResponse({ appPassword });
  } catch (error) {
    const errorId = logError('Failed to load app password', error);
    return errorResponse('Failed to load app password', 500, 'INTERNAL_ERROR', { errorId });
  }
};

/**
 * PATCH /api/user/app-passwords/:id
 * Renames one of the current user's app passwords or changes its permissions or limits. Needs a recent sign-in.
 */
export const PATCH: APIRoute = async (context) => {
  const user = context.locals.user;
  const session = context.locals.session;
  if (!user?.id || !session) return errorResponse('Unauthorized', 401);
  const id = context.params.id;
  if (!id) return errorResponse('Missing app password id', 400);

  const refused = refuseAppPasswordWrite('update', user.id, session);
  if (refused) return refused;

  const validation = await validateBody(context.request, updateAppPasswordSchema);
  if (isValidationError(validation)) {
    return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
  }

  try {
    const updated = await mcpAppPasswordService.update(user.id, id, validation.data);
    if (!updated) return notFound();

    const { before, after } = updated;
    await invalidateMcpToken(after.id);
    await securityActivityService.logEvent({
      type: 'app_password_updated',
      userId: user.id,
      entityId: after.id,
      oldValue: { name: before.name, permissions: before.permissions, limits: before.limits },
      newValue: { name: after.name, permissions: after.permissions, limits: after.limits },
    });

    return successResponse({ appPassword: after });
  } catch (error) {
    if (error instanceof AppPasswordError) {
      return errorResponse(error.message, error.status, error.code);
    }
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
