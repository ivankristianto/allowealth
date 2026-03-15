import type { APIRoute } from 'astro';
import { maxLength, object, optional, picklist, pipe, string, trim } from 'valibot';
import {
  errorResponse,
  getAuthenticatedUser,
  isValidationError,
  successResponse,
  validateBody,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import {
  clientSecurityActivityTypes,
  securityActivityService,
  type ClientSecurityActivityType,
} from '@/services/security-activity.service';

const clientActivitySchema = object({
  type: picklist([...clientSecurityActivityTypes] as [
    ClientSecurityActivityType,
    ...ClientSecurityActivityType[],
  ]),
  entityId: optional(pipe(string(), trim(), maxLength(255))),
});

export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const validation = await validateBody(context.request, clientActivitySchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    await securityActivityService.logEvent({
      type: validation.data.type,
      userId: auth.userId,
      entityId: validation.data.entityId ?? null,
    });

    return successResponse({ logged: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }

    logError('Failed to record security activity', error);
    return errorResponse('Failed to record security activity', 500);
  }
};
