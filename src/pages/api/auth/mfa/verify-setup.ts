/**
 * POST /api/auth/mfa/verify-setup
 *
 * Verify initial TOTP code to complete MFA setup.
 * Returns backup codes on success.
 */

import type { APIRoute } from 'astro';
import { mfaService } from '@/services';
import {
  applyRateLimitHeaders,
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from '@/lib/rate-limit';
import {
  createErrorResponseResponse,
  createSuccessResponse,
  STANDARD_RESPONSE_HEADERS,
} from '@/types/api';
import { logError } from '@/lib/utils';

export const prerender = false;

export const POST: APIRoute = async ({ locals, request, clientAddress }) => {
  const rateLimitResult = checkRateLimit(request, RATE_LIMIT_PRESETS.auth, clientAddress);
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult, 'Too many verification attempts. Please wait.');
  }

  const user = locals.user;
  if (!user) {
    const errorResponse = createErrorResponseResponse(
      'NOT_AUTHENTICATED',
      'Authentication required',
      401
    );
    return applyRateLimitHeaders(errorResponse, rateLimitResult);
  }
  if (!user.workspaceId) {
    const errorResponse = createErrorResponseResponse(
      'INVALID_STATE',
      'User workspace is required',
      400
    );
    return applyRateLimitHeaders(errorResponse, rateLimitResult);
  }

  try {
    const body = await request.json();
    const code = typeof body.code === 'string' ? body.code.trim() : '';

    if (!code) {
      const errorResponse = createErrorResponseResponse(
        'INVALID_INPUT',
        'Verification code is required',
        400
      );
      return applyRateLimitHeaders(errorResponse, rateLimitResult);
    }

    const backupCodes = await mfaService.verifySetup(user.id, code, user.workspaceId);

    const response = new Response(JSON.stringify(createSuccessResponse({ backupCodes })), {
      status: 200,
      headers: STANDARD_RESPONSE_HEADERS,
    });
    return applyRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    logError('MFA verify setup error', error);
    const message =
      error instanceof Error && /invalid verification code/i.test(error.message)
        ? 'Invalid verification code'
        : 'Unable to verify MFA setup';
    const status = message === 'Invalid verification code' ? 401 : 400;
    const errorResponse = createErrorResponseResponse('MFA_VERIFY_ERROR', message, status);
    return applyRateLimitHeaders(errorResponse, rateLimitResult);
  }
};
