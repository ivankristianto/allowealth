import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { minLength, object, pipe, string } from 'valibot';
import { auth } from '@/lib/auth/server';
import {
  successResponse,
  errorResponse,
  getAuthenticatedUser,
  validateBody,
  isValidationError,
} from '@/lib/api-utils';
import { createRenderHelper } from '@/lib/api/renderResponse';
import { logError } from '@/lib/utils';
import { SessionManagementService } from '@/services/session-management.service';
import SecuritySessionsListPartial from '@/components/partials/SecuritySessionsListPartial.astro';

const revokeSessionSchema = object({
  token: pipe(string(), minLength(1, 'Session token is required')),
});

/**
 * GET /api/user/sessions
 * List active sessions for the current user.
 * Supports ?_render=html for server-rendered list partial.
 */
export const GET: APIRoute = async (context) => {
  const { url } = context;
  const render = createRenderHelper(url);

  try {
    getAuthenticatedUser(context);
    const currentToken = context.locals.session?.token;

    const rawSessions = await auth.api.listSessions({
      headers: context.request.headers,
    });

    const sessions = SessionManagementService.listForUser(rawSessions, currentToken ?? '');

    if (render.wantsHtml()) {
      const container = await AstroContainer.create();
      const html = await container.renderToString(SecuritySessionsListPartial, {
        props: { sessions },
      });
      return render.html(html);
    }

    return successResponse({ sessions });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Failed to list sessions', error);
    return errorResponse('Failed to list sessions', 500);
  }
};

/**
 * DELETE /api/user/sessions
 * Revoke a single non-current session by token.
 */
export const DELETE: APIRoute = async (context) => {
  try {
    getAuthenticatedUser(context);
    const currentToken = context.locals.session?.token;

    const validation = await validateBody(context.request, revokeSessionSchema);
    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    SessionManagementService.validateRevoke(validation.data.token, currentToken ?? '');

    await auth.api.revokeSession({
      headers: context.request.headers,
      body: { token: validation.data.token },
    });

    return successResponse({ message: 'Session revoked' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof Error && error.message === 'Cannot revoke the current session') {
      return errorResponse(error.message, 400);
    }
    logError('Failed to revoke session', error);
    return errorResponse('Failed to revoke session', 500);
  }
};

/**
 * POST /api/user/sessions
 * Revoke all sessions except the current one.
 */
export const POST: APIRoute = async (context) => {
  try {
    getAuthenticatedUser(context);

    await auth.api.revokeOtherSessions({
      headers: context.request.headers,
    });

    return successResponse({ message: 'All other sessions revoked' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Failed to revoke other sessions', error);
    return errorResponse('Failed to revoke other sessions', 500);
  }
};
