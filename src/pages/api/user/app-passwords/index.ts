import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { errorResponse, isValidationError, successResponse, validateBody } from '@/lib/api-utils';
import {
  HTML_RENDER_REQUEST_REQUIRED_MESSAGE,
  createRenderHelper,
  isRejectedHtmlRenderRequest,
} from '@/lib/api/renderResponse';
import { refuseAppPasswordWrite } from '@/lib/app-password-write-guard';
import { logError } from '@/lib/logger';
import { createAppPasswordSchema } from '@/lib/validation/app-passwords';
import { AppPasswordError, mcpAppPasswordService } from '@/services/mcp-app-password.service';
import { securityActivityService } from '@/services/security-activity.service';
import SecurityAppPasswordsListPartial from '@/components/partials/SecurityAppPasswordsListPartial.astro';

/**
 * GET /api/user/app-passwords
 * Lists the current user's app passwords. Supports ?_render=html.
 */
export const GET: APIRoute = async (context) => {
  const render = createRenderHelper(context.url, context.request);
  if (isRejectedHtmlRenderRequest(context.url, context.request)) {
    return render.error(HTML_RENDER_REQUEST_REQUIRED_MESSAGE, 403);
  }

  const user = context.locals.user;
  if (!user?.id) return errorResponse('Unauthorized', 401);

  try {
    const appPasswords = await mcpAppPasswordService.listForUser(user.id);

    if (render.wantsHtml()) {
      const container = await AstroContainer.create();
      const html = await container.renderToString(SecurityAppPasswordsListPartial, {
        props: { appPasswords },
      });
      return render.html(html);
    }

    return successResponse({ appPasswords });
  } catch (error) {
    logError('Failed to list app passwords', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to list app passwords',
      500
    );
  }
};

/**
 * POST /api/user/app-passwords
 * Creates an app password and returns the raw token once. Needs a recent sign-in.
 */
export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  const session = context.locals.session;
  if (!user?.id || !session) return errorResponse('Unauthorized', 401);
  const refused = refuseAppPasswordWrite('create', user.id, session);
  if (refused) return refused;

  const validation = await validateBody(context.request, createAppPasswordSchema);
  if (isValidationError(validation)) {
    return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
  }

  try {
    const { token, appPassword } = await mcpAppPasswordService.create({
      userId: user.id,
      ...validation.data,
    });

    await securityActivityService.logEvent({
      type: 'app_password_created',
      userId: user.id,
      entityId: appPassword.id,
      newValue: {
        name: appPassword.name,
        permissions: appPassword.permissions,
        preset: appPassword.preset,
        limits: appPassword.limits,
        expiresAt: appPassword.expiresAt?.toISOString() ?? null,
      },
    });

    const response = successResponse({ token, appPassword }, 201);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    if (error instanceof AppPasswordError) {
      return errorResponse(error.message, error.code === 'LIMIT_REACHED' ? 409 : 400, error.code);
    }
    logError('Failed to create app password', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to create app password',
      500
    );
  }
};
