import type { APIRoute } from 'astro';
import { recurringTemplateService, RecurringServiceError, ServiceError } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';

export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const id = context.params.id;

    if (!id) {
      return errorResponse('Recurring template ID is required', 400);
    }

    const result = await recurringTemplateService.cancel(id, auth.workspaceId);
    return successResponse(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }

    if (error instanceof RecurringServiceError || error instanceof ServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }

    return errorResponse('Failed to cancel recurring template', 500);
  }
};
