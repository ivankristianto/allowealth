import type { APIRoute } from 'astro';
import { errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/logger';
import { getOpenApiJson } from '@/lib/openapi/document';

/** GET /api/openapi.json: the bundled spec, for a signed-in session or an app password. */
export const GET: APIRoute = async (context) => {
  try {
    getAuthenticatedUser(context);
  } catch {
    return errorResponse('Unauthorized', 401);
  }

  try {
    return new Response(getOpenApiJson(), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    const errorId = logError('Error building OpenAPI document', error);
    return errorResponse('Failed to load the API description', 500, 'INTERNAL_ERROR', { errorId });
  }
};
