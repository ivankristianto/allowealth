import type { APIRoute } from 'astro';
import {
  recurringTemplateService,
  recurringOccurrenceService,
  RecurringServiceError,
  ServiceError,
} from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import {
  updateRecurringTemplateAPISchema,
  type UpdateRecurringTemplateAPIInput,
} from '@/lib/validation/recurring';

export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const id = context.params.id;

    if (!id) {
      return errorResponse('Recurring template ID is required', 400);
    }

    const template = await recurringTemplateService.findById(id, auth.workspaceId);
    if (!template) {
      return errorResponse('Recurring template not found', 404);
    }

    const occurrences = await recurringOccurrenceService.findByTemplate(id, auth.workspaceId);

    return successResponse({
      ...template,
      occurrences,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }

    if (error instanceof RecurringServiceError || error instanceof ServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }

    return errorResponse('Failed to fetch recurring template', 500);
  }
};

export const PUT: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const id = context.params.id;

    if (!id) {
      return errorResponse('Recurring template ID is required', 400);
    }

    const contentType = context.request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return errorResponse('Content-Type must be application/json', 415, 'UNSUPPORTED_MEDIA_TYPE');
    }

    const validation = await validateBody(context.request, updateRecurringTemplateAPISchema);
    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const payload = validation.data as UpdateRecurringTemplateAPIInput;

    const updateData: Record<string, unknown> = {
      workspace_id: auth.workspaceId,
    };

    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.type !== undefined) updateData.type = payload.type;
    if (payload.amount !== undefined) updateData.amount = payload.amount;
    if (payload.currency !== undefined) updateData.currency = payload.currency;
    if (payload.category_id !== undefined) updateData.category_id = payload.category_id;
    if (payload.account_id !== undefined) updateData.account_id = payload.account_id;
    if (payload.day_of_month !== undefined) updateData.day_of_month = Number(payload.day_of_month);
    if (payload.start_date !== undefined) updateData.start_date = payload.start_date;
    if (payload.end_date !== undefined) updateData.end_date = payload.end_date;
    if (payload.total_occurrences !== undefined) {
      updateData.total_occurrences =
        payload.total_occurrences === null ? null : Number(payload.total_occurrences);
    }
    if (payload.is_installment !== undefined) updateData.is_installment = payload.is_installment;
    if (payload.installment_label !== undefined)
      updateData.installment_label = payload.installment_label;
    if (payload.starting_occurrence_number !== undefined)
      updateData.starting_occurrence_number = Number(payload.starting_occurrence_number);
    if (payload.frequency !== undefined) updateData.frequency = payload.frequency;
    if (payload.interval_count !== undefined)
      updateData.interval_count = Number(payload.interval_count);
    if (payload.description !== undefined) updateData.description = payload.description;
    const updated = await recurringTemplateService.update(
      id,
      auth.workspaceId,
      updateData as any,
      auth.userId
    );

    return successResponse(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }

    if (error instanceof RecurringServiceError || error instanceof ServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }

    return errorResponse('Failed to update recurring template', 500);
  }
};

export const DELETE: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const id = context.params.id;

    if (!id) {
      return errorResponse('Recurring template ID is required', 400);
    }

    await recurringTemplateService.delete(id, auth.workspaceId, auth.userId);

    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }

    if (error instanceof RecurringServiceError || error instanceof ServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }

    return errorResponse('Failed to delete recurring template', 500);
  }
};
