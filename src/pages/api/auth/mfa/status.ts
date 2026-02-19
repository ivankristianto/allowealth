/**
 * GET /api/auth/mfa/status
 *
 * Get MFA status for the authenticated user.
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

export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) {
    return createErrorResponseResponse('NOT_AUTHENTICATED', 'Authentication required', 401);
  }

  try {
    const status = await mfaService.getStatus(user.id);

    return new Response(JSON.stringify(createSuccessResponse(status)), {
      status: 200,
      headers: STANDARD_RESPONSE_HEADERS,
    });
  } catch (error) {
    logError('MFA status error', error);
    return createErrorResponseResponse('MFA_STATUS_ERROR', 'Unable to fetch MFA status', 500);
  }
};
