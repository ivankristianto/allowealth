/**
 * POST /api/auth/mfa/setup
 *
 * Initialize MFA setup by generating a TOTP secret and QR code.
 * Requires authenticated session.
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

export const POST: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) {
    return createErrorResponseResponse('NOT_AUTHENTICATED', 'Authentication required', 401);
  }
  if (!user.workspaceId) {
    return createErrorResponseResponse('INVALID_STATE', 'User workspace is required', 400);
  }

  try {
    const result = await mfaService.initSetup(user.id, user.email, user.workspaceId);

    return new Response(
      JSON.stringify(
        createSuccessResponse({
          qrCodeDataUrl: result.qrCodeDataUrl,
          manualEntryCode: result.manualEntryCode,
        })
      ),
      {
        status: 200,
        headers: STANDARD_RESPONSE_HEADERS,
      }
    );
  } catch (error) {
    logError('MFA setup error', error);
    const message = error instanceof Error ? error.message : 'MFA setup failed';
    return createErrorResponseResponse('MFA_SETUP_ERROR', message, 400);
  }
};
