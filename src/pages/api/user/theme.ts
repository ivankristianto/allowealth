import type { APIRoute } from 'astro';
import { object, picklist } from 'valibot';
import { USER_META_KEYS } from '@/lib/constants/user-meta-keys';
import {
  errorResponse,
  getAuthenticatedUser,
  isValidationError,
  successResponse,
  validateBody,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { userMetaService, securityActivityService } from '@/services';
import { UserMetaServiceError } from '@/services/service-errors';

const updateThemeSchema = object({
  theme: picklist(
    ['system', 'light', 'dark', 'monochrome'],
    'Theme must be one of: system, light, dark, monochrome'
  ),
});

export const PUT: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const validation = await validateBody(context.request, updateThemeSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const { theme } = validation.data;
    await userMetaService.setUserMeta(auth.userId, USER_META_KEYS.THEME, theme);

    await securityActivityService.logEvent({
      type: 'theme_changed',
      userId: auth.userId,
      newValue: { theme },
    });

    return successResponse({ theme });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }

    if (error instanceof UserMetaServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }

    logError('PUT /api/user/theme', error);
    return errorResponse('Failed to update theme preference', 500);
  }
};
