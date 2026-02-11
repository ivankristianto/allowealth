/**
 * POST /api/auth/google/unlink
 *
 * Unlink Google OAuth from the authenticated user's account.
 * Requires the user to have a password set (prevents locking out).
 */

import type { APIRoute } from 'astro';
import { unlinkOAuthProvider, AUTH_ERRORS, AuthError } from '@/services/auth.service';
import {
  createErrorResponseResponse,
  createSuccessResponse,
  STANDARD_RESPONSE_HEADERS,
} from '@/types/api';
import { createLogger } from '@/lib/logger';

const log = createLogger('oauth:google:unlink');

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return createErrorResponseResponse('NOT_AUTHENTICATED', 'Not authenticated', 401);
    }

    await unlinkOAuthProvider(user.id, 'google');

    return new Response(
      JSON.stringify(createSuccessResponse({ message: 'Google account unlinked' })),
      {
        status: 200,
        headers: STANDARD_RESPONSE_HEADERS,
      }
    );
  } catch (error) {
    if (error instanceof AuthError && error.code === AUTH_ERRORS.OAUTH_UNLINK_DENIED) {
      return createErrorResponseResponse(AUTH_ERRORS.OAUTH_UNLINK_DENIED, error.message, 400);
    }

    log.error('Unlink error', error);
    return createErrorResponseResponse('INTERNAL_SERVER_ERROR', 'Failed to unlink account', 500);
  }
};
