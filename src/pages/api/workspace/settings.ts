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
import {
  literal,
  maxLength,
  maxValue,
  minLength,
  minValue,
  null_,
  number,
  object,
  optional,
  picklist,
  pipe,
  record,
  regex,
  string,
  union,
} from 'valibot';
import { AVAILABLE_CURRENCIES } from '@/lib/constants/currency';
import {
  MONTHLY_INCOME_AMOUNT_PATTERN,
  parseMonthlyIncomeValue,
} from '@/lib/constants/workspace-meta-keys';
import { getCacheManager, CacheTags } from '@/lib/cache';
import { MAX_FORECAST_ANNUAL_RATE, MAX_FORECAST_MONTHLY_TOPUP } from '@/lib/forecast/assumptions';

const currencySchema = picklist(AVAILABLE_CURRENCIES);

/**
 * Schema for PUT request body - workspace settings update
 */
const updateWorkspaceSettingsSchema = object({
  name: optional(pipe(string(), minLength(1), maxLength(255))),
  currency: optional(currencySchema),
  secondaryCurrency: optional(union([currencySchema, literal(''), null_()])),
  weekStart: optional(picklist(['monday', 'sunday'])),
  monthlyIncome: optional(
    record(
      picklist(AVAILABLE_CURRENCIES, 'Invalid currency code'),
      pipe(string(), regex(MONTHLY_INCOME_AMOUNT_PATTERN))
    )
  ),
  forecastMonthlyTopup: optional(pipe(number(), minValue(0), maxValue(MAX_FORECAST_MONTHLY_TOPUP))),
  forecastAnnualRate: optional(pipe(number(), minValue(0), maxValue(MAX_FORECAST_ANNUAL_RATE))),
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
        monthlyIncome: parseMonthlyIncomeValue(settings.monthlyIncome),
        forecastMonthlyTopup: settings.forecastMonthlyTopup,
        forecastAnnualRate: settings.forecastAnnualRate,
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
 * All members can update preferences (currency, secondaryCurrency, weekStart, monthlyIncome,
 * forecastMonthlyTopup, forecastAnnualRate).
 */
export const PUT: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    const validation = await validateBody(context.request, updateWorkspaceSettingsSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const {
      name,
      currency,
      secondaryCurrency,
      weekStart,
      monthlyIncome,
      forecastMonthlyTopup,
      forecastAnnualRate,
    } = validation.data;

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
    if (forecastMonthlyTopup !== undefined) {
      await workspaceMetaService.setForecastMonthlyTopup(auth.workspaceId, forecastMonthlyTopup);
    }
    if (forecastAnnualRate !== undefined) {
      await workspaceMetaService.setForecastAnnualRate(auth.workspaceId, forecastAnnualRate);
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
        monthlyIncome: parseMonthlyIncomeValue(settings.monthlyIncome),
        forecastMonthlyTopup: settings.forecastMonthlyTopup,
        forecastAnnualRate: settings.forecastAnnualRate,
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
