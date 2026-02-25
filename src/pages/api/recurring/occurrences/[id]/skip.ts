import type { APIRoute } from 'astro';
import { recurringOccurrenceService, RecurringServiceError, ServiceError } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';

export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const id = context.params.id;

    if (!id) {
      return errorResponse('Recurring occurrence ID is required', 400);
    }

    let reason: string | undefined;
    const contentType = context.request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const payload = await context.request.json().catch(() => ({}));
      reason = typeof payload?.skip_reason === 'string' ? payload.skip_reason : undefined;
    }

    const result = await recurringOccurrenceService.skip(id, auth.workspaceId, reason);
    return successResponse(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }

    if (error instanceof RecurringServiceError || error instanceof ServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }

    return errorResponse('Failed to skip recurring occurrence', 500);
  }
};
