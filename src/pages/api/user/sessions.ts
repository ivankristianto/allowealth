import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { minLength, object, pipe, string } from 'valibot';
import { auth } from '@/lib/auth/server';
import { successResponse, errorResponse, validateBody, isValidationError } from '@/lib/api-utils';
import {
  HTML_RENDER_REQUEST_REQUIRED_MESSAGE,
  createRenderHelper,
  isRejectedHtmlRenderRequest,
} from '@/lib/api/renderResponse';
import { checkRateLimitByKey, createRateLimitResponse, RATE_LIMIT_PRESETS } from '@/lib/rate-limit';
import { logError } from '@/lib/utils';
import { SessionManagementService } from '@/services/session-management.service';
import SecuritySessionsListPartial from '@/components/partials/SecuritySessionsListPartial.astro';

const revokeSessionSchema = object({
  id: pipe(string(), minLength(1, 'Session ID is required')),
});

/**
 * GET /api/user/sessions
 * List active sessions for the current user.
 * Supports ?_render=html for server-rendered list partial.
 */
export const GET: APIRoute = async (context) => {
  const { url } = context;
  const render = createRenderHelper(url, context.request);
  if (isRejectedHtmlRenderRequest(url, context.request)) {
    return render.error(HTML_RENDER_REQUEST_REQUIRED_MESSAGE, 403);
  }

  try {
    const user = context.locals.user;
    if (!user?.id) return errorResponse('Unauthorized', 401);
    const currentToken = context.locals.session?.token;
    if (!currentToken) return errorResponse('Unauthorized', 401);

    const rawSessions = await auth.api.listSessions({
      headers: context.request.headers,
    });

    const sessions = SessionManagementService.listForUser(rawSessions, currentToken);

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
 * Revoke a single non-current session by ID.
 * Accepts { id } in the body — the token is resolved server-side
 * to avoid exposing session tokens in the client HTML.
 */
export const DELETE: APIRoute = async (context) => {
  try {
    const user = context.locals.user;
    if (!user?.id) return errorResponse('Unauthorized', 401);
    const currentToken = context.locals.session?.token;
    if (!currentToken) return errorResponse('Unauthorized', 401);

    const rateLimitResult = checkRateLimitByKey(
      `session-revocation:${user.id}`,
      RATE_LIMIT_PRESETS.sessionRevocation
    );
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, RATE_LIMIT_PRESETS.sessionRevocation.message);
    }

    const validation = await validateBody(context.request, revokeSessionSchema);
    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    // Look up sessions to find the token for the given ID
    const rawSessions = await auth.api.listSessions({
      headers: context.request.headers,
    });

    const target = rawSessions.find((s: { id: string }) => s.id === validation.data.id);
    if (!target) {
      return errorResponse('Session not found', 404);
    }

    SessionManagementService.validateRevoke(target.token, currentToken);

    await auth.api.revokeSession({
      headers: context.request.headers,
      body: { token: target.token },
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
    const user = context.locals.user;
    if (!user?.id) return errorResponse('Unauthorized', 401);

    const rateLimitResult = checkRateLimitByKey(
      `session-revocation:${user.id}`,
      RATE_LIMIT_PRESETS.sessionRevocation
    );
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, RATE_LIMIT_PRESETS.sessionRevocation.message);
    }

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
