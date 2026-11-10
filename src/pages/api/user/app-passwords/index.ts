import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import * as v from 'valibot';
import { errorResponse, isValidationError, successResponse, validateBody } from '@/lib/api-utils';
import {
  HTML_RENDER_REQUEST_REQUIRED_MESSAGE,
  createRenderHelper,
  isRejectedHtmlRenderRequest,
} from '@/lib/api/renderResponse';
import {
  APP_PASSWORD_EXPIRY_OPTIONS,
  APP_PASSWORD_NAME_MAX_LENGTH,
  APP_PASSWORD_SCOPES,
  isRecentSignIn,
} from '@/lib/mcp-app-password';
import { isDemoMode } from '@/lib/demo-mode';
import { checkRateLimitByKey, createRateLimitResponse } from '@/lib/rate-limit';
import { logError } from '@/lib/utils';
import { AppPasswordError, mcpAppPasswordService } from '@/services/mcp-app-password.service';
import { securityActivityService } from '@/services/security-activity.service';
import SecurityAppPasswordsListPartial from '@/components/partials/SecurityAppPasswordsListPartial.astro';

const CREATE_RATE_LIMIT = { maxRequests: 10, windowMs: 15 * 60 * 1000 };

const createAppPasswordSchema = v.object({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, 'Name is required'),
    v.maxLength(APP_PASSWORD_NAME_MAX_LENGTH, 'Name is too long')
  ),
  scope: v.picklist(APP_PASSWORD_SCOPES, 'Choose read or read-write'),
  expiry: v.picklist(APP_PASSWORD_EXPIRY_OPTIONS, 'Choose an expiry'),
});

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
  if (isDemoMode()) return errorResponse('App passwords are disabled in demo mode', 403);

  if (!isRecentSignIn(session.createdAt)) {
    return errorResponse(
      'Sign in again to create an app password. This needs a sign-in from the last 15 minutes.',
      403,
      'REAUTH_REQUIRED'
    );
  }

  const rateLimit = checkRateLimitByKey(`app-password-create:${user.id}`, CREATE_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit, 'Too many app passwords created. Try again later.');
  }

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
        scope: appPassword.scope,
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
