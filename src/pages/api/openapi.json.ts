import type { APIRoute } from 'astro';
import { errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/logger';
import { getOpenApiDocument, getOpenApiJson } from '@/lib/openapi/document';
import { filterOpenApiForAppPassword } from '@/lib/openapi/filter';

/** GET /api/openapi.json: the whole spec for a session, only its own operations for an app password. */
export const GET: APIRoute = async (context) => {
  try {
    getAuthenticatedUser(context);
  } catch {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const appPassword = context.locals.appPassword;
    const body = appPassword
      ? JSON.stringify(filterOpenApiForAppPassword(getOpenApiDocument(), appPassword.permissions))
      : getOpenApiJson();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300',
        // The body depends on which token, if any, asked for it.
        Vary: 'Authorization',
      },
    });
  } catch (error) {
    const errorId = logError('Error building OpenAPI document', error);
    return errorResponse('Failed to load the API description', 500, 'INTERNAL_ERROR', { errorId });
  }
};
