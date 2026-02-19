/**
 * POST /api/auth/mfa/verify-setup
 *
 * Verify initial TOTP code to complete MFA setup.
 * Returns backup codes on success.
 */

import type { APIRoute } from 'astro';
import { mfaService } from '@/services';
import {
  createErrorResponseResponse,
  createSuccessResponse,
  STANDARD_RESPONSE_HEADERS,
} from '@/types/api';
import { logError } from '@/lib/utils';

export const prerender = false;

export const POST: APIRoute = async ({ locals, request }) => {
  const user = locals.user;
  if (!user) {
    return createErrorResponseResponse('NOT_AUTHENTICATED', 'Authentication required', 401);
  }

  try {
    const body = await request.json();
    const code = typeof body.code === 'string' ? body.code.trim() : '';

    if (!code) {
      return createErrorResponseResponse('INVALID_INPUT', 'Verification code is required', 400);
    }

    const backupCodes = await mfaService.verifySetup(user.id, code);

    return new Response(JSON.stringify(createSuccessResponse({ backupCodes })), {
      status: 200,
      headers: STANDARD_RESPONSE_HEADERS,
    });
  } catch (error) {
    logError('MFA verify setup error', error);
    const message = error instanceof Error ? error.message : 'Verification failed';
    return createErrorResponseResponse('MFA_VERIFY_ERROR', message, 400);
  }
};
