import type { APIRoute } from 'astro';
import { reportService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { BudgetServiceError } from '@/services/service-errors';
import { validatePeriod } from '@/lib/utils/period-validation';

/**
 * GET /api/reports/category-transactions
 * Get all transactions for a specific category within a period (for drill-down modal)
 *
 * Query params:
 *   - categoryId: string (required) - Category ID
 *   - period: string (required) - 'YYYY-MM' for monthly, 'YYYY' for yearly
 *   - range: 'monthly' | 'yearly' (required)
 *
 * Returns:
 *   {
 *     success: true,
 *     data: {
 *       transactions: CategoryTransaction[],
 *       total: string,
 *       categoryName: string
 *     }
 *   }
 *
 * Security:
 *   - Requires authentication (validates userId from session)
 *   - Validates category ownership (service enforces access control)
 *   - Validates period format to prevent SQL injection
 *   - Returns 404 if category not found or user doesn't own it
 */
export const GET: APIRoute = async (context) => {
  const { url } = context;

  try {
    // 1. Authenticate user
    const userId = getAuthenticatedUser(context);

    // 2. Extract and validate query parameters
    const categoryId = url.searchParams.get('categoryId');
    const period = url.searchParams.get('period');
    const range = url.searchParams.get('range') as 'monthly' | 'yearly' | null;

    // P2: TODO - Add UUID format validation for categoryId if using UUIDs
    // Validate categoryId
    if (!categoryId || typeof categoryId !== 'string' || categoryId.trim() === '') {
      return errorResponse('Category ID is required.', 400, 'MISSING_CATEGORY_ID');
    }

    // Validate range
    if (!range || (range !== 'monthly' && range !== 'yearly')) {
      return errorResponse(
        "Invalid range parameter. Must be 'monthly' or 'yearly'.",
        400,
        'INVALID_RANGE'
      );
    }

    // Validate period
    if (!period || typeof period !== 'string' || period.trim() === '') {
      return errorResponse('Period parameter is required.', 400, 'MISSING_PERIOD');
    }

    // P3: TODO - Add rate limiting for expensive report queries
    // P3: TODO - Add audit logging for compliance and debugging
    // Validate period format and ranges
    try {
      validatePeriod(period, range);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Invalid period format.';
      // Map error message to appropriate error code
      let errorCode = 'INVALID_PERIOD';
      if (errorMsg.includes('format')) {
        errorCode = 'INVALID_PERIOD_FORMAT';
      } else if (errorMsg.includes('month')) {
        errorCode = 'INVALID_MONTH';
      } else if (errorMsg.includes('year')) {
        errorCode = 'INVALID_YEAR';
      }
      return errorResponse(errorMsg, 400, errorCode);
    }

    // 3. Call service to fetch category transactions
    // Service will validate category ownership and throw BudgetServiceError if not found
    const categoryTransactionsData = await reportService.getCategoryTransactions(
      userId,
      categoryId,
      period,
      range
    );

    // 4. Return successful JSON response
    return successResponse(categoryTransactionsData);
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Handle category not found or access denied errors
    if (error instanceof BudgetServiceError) {
      return errorResponse(error.message, error.statusCode, error.code || 'CATEGORY_NOT_FOUND');
    }

    // Log and return generic error
    logError('Error fetching category transactions', error);
    return errorResponse('Failed to fetch category transactions', 500, 'INTERNAL_ERROR');
  }
};
