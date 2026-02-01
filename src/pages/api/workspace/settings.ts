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

/**
 * Schema for PUT request body - workspace settings update
 */
const updateWorkspaceSettingsSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  currency: z.enum(['IDR', 'USD']).optional(),
  weekStart: z.enum(['monday', 'sunday']).optional(),
  compactNumbers: z.boolean().optional(),
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
        weekStart: settings.weekStart,
        compactNumbers: settings.compactNumbers,
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
 * All members can update preferences (currency, weekStart, compactNumbers).
 */
export const PUT: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    const validation = await validateBody(context.request, updateWorkspaceSettingsSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const { name, currency, weekStart, compactNumbers } = validation.data;

    // Name changes require admin role
    if (name !== undefined && auth.role !== 'admin') {
      return errorResponse('Admin access required to change workspace name', 403, 'ADMIN_REQUIRED');
    }

    // Update workspace name if provided
    if (name !== undefined) {
      await workspaceService.updateName(auth.workspaceId, name);
    }

    // Update meta values
    if (currency !== undefined) {
      await workspaceMetaService.setCurrency(auth.workspaceId, currency);
    }
    if (weekStart !== undefined) {
      await workspaceMetaService.setWeekStart(auth.workspaceId, weekStart);
    }
    if (compactNumbers !== undefined) {
      await workspaceMetaService.setCompactNumbers(auth.workspaceId, compactNumbers);
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
        weekStart: settings.weekStart,
        compactNumbers: settings.compactNumbers,
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
