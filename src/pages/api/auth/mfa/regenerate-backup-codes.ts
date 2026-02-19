/**
 * POST /api/auth/mfa/regenerate-backup-codes
 *
 * Regenerate MFA backup codes for the authenticated user.
 * Requires valid TOTP code.
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
  if (!user.workspaceId) {
    return createErrorResponseResponse('INVALID_STATE', 'User workspace is required', 400);
  }

  try {
    const body = await request.json();
    const code = typeof body.code === 'string' ? body.code.trim() : '';

    if (!code) {
      return createErrorResponseResponse('INVALID_INPUT', 'TOTP code is required', 400);
    }

    const backupCodes = await mfaService.regenerateBackupCodes(user.id, code, user.workspaceId);

    return new Response(JSON.stringify(createSuccessResponse({ backupCodes })), {
      status: 200,
      headers: STANDARD_RESPONSE_HEADERS,
    });
  } catch (error) {
    logError('Backup code regeneration error', error);
    const message = error instanceof Error ? error.message : 'Failed to regenerate codes';
    return createErrorResponseResponse('MFA_REGENERATE_ERROR', message, 400);
  }
};
