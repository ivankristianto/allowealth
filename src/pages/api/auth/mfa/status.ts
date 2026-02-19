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

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) {
    return createErrorResponseResponse('NOT_AUTHENTICATED', 'Authentication required', 401);
  }

  const status = await mfaService.getStatus(user.id);

  return new Response(JSON.stringify(createSuccessResponse(status)), {
    status: 200,
    headers: STANDARD_RESPONSE_HEADERS,
  });
};
