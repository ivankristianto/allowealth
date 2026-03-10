import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { check, maxLength, minLength, object, optional, pipe, string, trim } from 'valibot';
import { apiKeyService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { createRenderHelper } from '@/lib/api/renderResponse';
import { logError } from '@/lib/utils';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit';
import SecurityApiKeysListPartial from '@/components/partials/SecurityApiKeysListPartial.astro';

const MAX_KEYS_PER_USER = 25;

const generateKeySchema = object({
  name: pipe(string(), trim(), minLength(1, 'Name is required'), maxLength(100)),
  expires_at: optional(
    pipe(
      string(),
      check((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid date format')
    )
  ),
});

const revokeKeySchema = object({
  id: pipe(string(), minLength(1, 'Key ID is required')),
});

/**
 * GET /api/user/api-keys
 * List API keys for the current user.
 * Supports ?_render=html for server-rendered list partial.
 */
export const GET: APIRoute = async (context) => {
  const { url } = context;
  const render = createRenderHelper(url);

  try {
    const auth = getAuthenticatedUser(context);
    const keys = await apiKeyService.list(auth.workspaceId, auth.userId);

    if (render.wantsHtml()) {
      const container = await AstroContainer.create();
      const html = await container.renderToString(SecurityApiKeysListPartial, {
        props: { keys },
      });
      return render.html(html);
    }

    return successResponse({ keys });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Failed to list API keys', error);
    return errorResponse('Failed to list API keys', 500);
  }
};

/**
 * POST /api/user/api-keys
 * Generate a new API key.
 * Rate limited: 10 per hour per user. Max 25 active keys per user.
 */
export const POST: APIRoute = async (context) => {
  const rateLimitResult = checkRateLimit(context.request, {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
    keyGenerator: () => {
      try {
        const auth = getAuthenticatedUser(context);
        return `apikey-gen:${auth.userId}`;
      } catch {
        return `apikey-gen:${context.clientAddress}`;
      }
    },
    message: 'Too many API key generation requests. Please try again later.',
  });
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const auth = getAuthenticatedUser(context);
    const validation = await validateBody(context.request, generateKeySchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    // Enforce max active keys per user
    const existingKeys = await apiKeyService.list(auth.workspaceId, auth.userId);
    if (existingKeys.length >= MAX_KEYS_PER_USER) {
      return errorResponse(
        `Maximum of ${MAX_KEYS_PER_USER} active API keys reached. Revoke unused keys first.`,
        400
      );
    }

    const result = await apiKeyService.generate({
      workspace_id: auth.workspaceId,
      user_id: auth.userId,
      name: validation.data.name,
      expires_at: validation.data.expires_at ? new Date(validation.data.expires_at) : undefined,
    });

    return successResponse({
      plain_key: result.plainKey,
      api_key: result.apiKey,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Failed to generate API key', error);
    return errorResponse('Failed to generate API key', 500);
  }
};

/**
 * DELETE /api/user/api-keys
 * Revoke an API key. Only the key owner can revoke.
 */
export const DELETE: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const validation = await validateBody(context.request, revokeKeySchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    // Verify the key belongs to this user by checking list filtered by userId
    const userKeys = await apiKeyService.list(auth.workspaceId, auth.userId);
    const ownsKey = userKeys.some((k) => k.id === validation.data.id);

    if (!ownsKey) {
      return errorResponse('API key not found', 404);
    }

    const revoked = await apiKeyService.revoke(validation.data.id, auth.workspaceId);
    if (!revoked) {
      return errorResponse('API key not found', 404);
    }

    return successResponse({ message: 'API key revoked' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Failed to revoke API key', error);
    return errorResponse('Failed to revoke API key', 500);
  }
};
