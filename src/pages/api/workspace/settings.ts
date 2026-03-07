import type { APIRoute } from 'astro';
import { workspaceMetaService, workspaceService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { WorkspaceMetaServiceError, WorkspaceServiceError } from '@/services/service-errors';
import { z } from 'zod';
import { AVAILABLE_CURRENCIES } from '@/lib/constants/currency';
import { getCacheManager, CacheTags } from '@/lib/cache';

const currencySchema = z.enum(AVAILABLE_CURRENCIES);

/**
 * Schema for PUT request body - workspace settings update
 */
const updateWorkspaceSettingsSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  currency: currencySchema.optional(),
  secondaryCurrency: z.union([currencySchema, z.literal(''), z.null()]).optional(),
  weekStart: z.enum(['monday', 'sunday']).optional(),
  monthlyIncome: z
    .record(z.string(), z.string().regex(/^\d+(\.\d{1,2})?$/))
    .refine(
      (obj) =>
        Object.keys(obj).every((k) => (AVAILABLE_CURRENCIES as readonly string[]).includes(k)),
      { message: 'Invalid currency code' }
    )
    .optional(),
});

/**
 * GET /api/workspace/settings
 *
 * Retrieves the current workspace settings including name and preferences.
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    // Get workspace details
    const workspace = await workspaceService.findById(auth.workspaceId);
    if (!workspace) {
      return errorResponse('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
    }

    // Get workspace settings from meta
    const settings = await workspaceMetaService.getSettings(auth.workspaceId);

    return successResponse({
      id: workspace.id,
      name: workspace.name,
      createdAt: workspace.created_at,
      settings: {
        currency: settings.currency,
        secondaryCurrency: settings.secondaryCurrency,
        weekStart: settings.weekStart,
        monthlyIncome: settings.monthlyIncome,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof WorkspaceServiceError || error instanceof WorkspaceMetaServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error fetching workspace settings', error);
    return errorResponse('Failed to fetch workspace settings', 500);
  }
};

/**
 * PUT /api/workspace/settings
 *
 * Updates workspace settings. Admin only for name changes.
 * All members can update preferences (currency, secondaryCurrency, weekStart, monthlyIncome).
 */
export const PUT: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    const validation = await validateBody(context.request, updateWorkspaceSettingsSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const { name, currency, secondaryCurrency, weekStart, monthlyIncome } = validation.data;

    // Name changes require admin role
    if (name !== undefined && auth.role !== 'admin') {
      return errorResponse('Admin access required to change workspace name', 403, 'ADMIN_REQUIRED');
    }

    // Update workspace name if provided
    if (name !== undefined) {
      await workspaceService.updateName(auth.workspaceId, name);
    }

    // Currency updates are atomic across primary+secondary to prevent partial updates.
    if (currency !== undefined || secondaryCurrency !== undefined) {
      const currentSettings = await workspaceMetaService.getSettings(auth.workspaceId);
      const nextPrimaryCurrency = currency ?? currentSettings.currency;
      const nextSecondaryCurrency =
        secondaryCurrency === null ? '' : (secondaryCurrency ?? currentSettings.secondaryCurrency);

      await workspaceMetaService.setCurrencySettings(
        auth.workspaceId,
        nextPrimaryCurrency,
        nextSecondaryCurrency
      );
    }
    if (weekStart !== undefined) {
      await workspaceMetaService.setWeekStart(auth.workspaceId, weekStart);
    }
    if (monthlyIncome !== undefined) {
      await workspaceMetaService.setMonthlyIncome(auth.workspaceId, monthlyIncome);
    }

    // Invalidate layout cache since workspace settings changed (best-effort)
    try {
      const cache = getCacheManager();
      await cache.invalidateByTags([CacheTags.workspace(auth.workspaceId), CacheTags.LAYOUT]);
    } catch (cacheError) {
      logError(`Cache invalidation failed for workspace ${auth.workspaceId}`, cacheError);
    }

    // Get updated workspace and settings
    const workspace = await workspaceService.findById(auth.workspaceId);
    const settings = await workspaceMetaService.getSettings(auth.workspaceId);

    return successResponse({
      id: workspace!.id,
      name: workspace!.name,
      createdAt: workspace!.created_at,
      settings: {
        currency: settings.currency,
        secondaryCurrency: settings.secondaryCurrency,
        weekStart: settings.weekStart,
        monthlyIncome: settings.monthlyIncome,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof WorkspaceServiceError || error instanceof WorkspaceMetaServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error updating workspace settings', error);
    return errorResponse('Failed to update workspace settings', 500);
  }
};
