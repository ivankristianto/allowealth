import type { APIRoute } from 'astro';
import { errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/logger';
import { getOpenApiDocument, getOpenApiJson } from '@/lib/openapi/document';
import { filterOpenApiForAppPassword } from '@/lib/openapi/filter';

/** GET /api/openapi.json: the whole spec for a session, only its own operations for an app password. */
export const GET: APIRoute = async (context) => {
  try {
    getAuthenticatedUser(context);

    const appPassword = context.locals.appPassword;
    const body = appPassword
      ? JSON.stringify(filterOpenApiForAppPassword(getOpenApiDocument(), appPassword.permissions))
      : getOpenApiJson();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // A token's permissions can be edited at any time, so its copy is revalidated each fetch.
        'Cache-Control': appPassword ? 'private, no-cache' : 'private, max-age=300',
        // The body depends on which token, if any, asked for it.
        Vary: 'Authorization',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    const errorId = logError('Error building OpenAPI document', error);
    return errorResponse('Failed to load the API description', 500, 'INTERNAL_ERROR', { errorId });
  }
};
