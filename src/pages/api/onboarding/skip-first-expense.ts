import type { APIRoute } from 'astro';
import { workspaceMetaService, workspaceService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { WORKSPACE_META_KEYS } from '@/lib/constants/workspace-meta-keys';
import { logError } from '@/lib/utils';
import { WorkspaceMetaServiceError } from '@/services/service-errors';

export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    if (!auth.workspaceId) {
      return errorResponse('Workspace context required', 403);
    }

    const onboardingStatus = await workspaceService.getOnboardingStatus(auth.workspaceId);
    const canSkipFirstExpense =
      onboardingStatus.currency &&
      onboardingStatus.accounts &&
      onboardingStatus.income &&
      onboardingStatus.categories &&
      onboardingStatus.budgets;

    if (!canSkipFirstExpense) {
      return errorResponse(
        'Cannot skip first expense before completing prior onboarding steps',
        409
      );
    }

    await workspaceMetaService.set(
      auth.workspaceId,
      WORKSPACE_META_KEYS.ONBOARDING_EXPENSE_SKIPPED,
      'true'
    );

    return successResponse({ skipped: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof WorkspaceMetaServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }

    logError('Error skipping first onboarding expense', error);
    return errorResponse('Failed to skip first expense', 500);
  }
};
