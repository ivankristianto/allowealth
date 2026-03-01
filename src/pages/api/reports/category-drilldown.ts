import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { reportService, workspaceMetaService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { BudgetServiceError } from '@/services/service-errors';
import { validatePeriod } from '@/lib/utils/period-validation';
import { isValidNanoid } from '@/lib/validation/nanoid';
import { createRenderHelper } from '@/lib/api/renderResponse';
import { isValidCurrency, type Currency } from '@/lib/constants/currency';
import CategoryDrillDownPartial from '@/components/partials/CategoryDrillDownPartial.astro';

/**
 * GET /api/reports/category-drilldown
 * Get complete drill-down modal content for a specific category
 *
 * Query params:
 *   - categoryId: string (required) - Category ID
 *   - period: string (required) - 'YYYY-MM' for monthly, 'YYYY' for yearly
 *   - range: 'monthly' | 'yearly' (required)
 *   - categoryName: string (required) - Category name
 *   - categoryIcon: string (required) - Category icon name
 *   - categoryColor: string (required) - Category color class
 *   - spent: number (required) - Amount spent
 *   - budgetLimit: number (optional) - Budget limit
 *   - currency: Currency (required)
 *
 * Returns HTML or JSON with complete modal content
 *
 * Security:
 *   - Requires authentication (validates userId from session)
 *   - Validates category ownership (service enforces access control)
 *   - Validates period format to prevent SQL injection
 *   - Returns 404 if category not found or user doesn't own it
 */
export const GET: APIRoute = async (context) => {
  const { url } = context;
  const render = createRenderHelper(url);

  try {
    // 1. Authenticate user
    const auth = getAuthenticatedUser(context);

    // 2. Extract and validate query parameters
    const categoryId = url.searchParams.get('categoryId');
    const period = url.searchParams.get('period');
    const range = url.searchParams.get('range') as 'monthly' | 'yearly' | null;
    const categoryName = url.searchParams.get('categoryName');
    const categoryIcon = url.searchParams.get('categoryIcon') || 'tag';
    const categoryColor = url.searchParams.get('categoryColor') || 'bg-base-300';
    const spent = parseFloat(url.searchParams.get('spent') || '0');
    const budgetLimitParam = url.searchParams.get('budgetLimit');
    const budgetLimit = budgetLimitParam ? parseFloat(budgetLimitParam) : null;
    const currencyParam = url.searchParams.get('currency');
    const limitParam = url.searchParams.get('limit');
    const offsetParam = url.searchParams.get('offset');

    // Validate categoryId
    if (!categoryId || typeof categoryId !== 'string' || categoryId.trim() === '') {
      return errorResponse('Category ID is required.', 400, 'MISSING_CATEGORY_ID');
    }

    if (!isValidNanoid(categoryId)) {
      return errorResponse(
        'Invalid category ID format. Expected 21-character nanoid.',
        400,
        'INVALID_CATEGORY_ID'
      );
    }

    // Validate categoryName
    if (!categoryName || typeof categoryName !== 'string' || categoryName.trim() === '') {
      return errorResponse('Category name is required.', 400, 'MISSING_CATEGORY_NAME');
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

    if (!currencyParam || !isValidCurrency(currencyParam)) {
      return errorResponse(
        'Invalid currency code. Must be one of supported currencies.',
        400,
        'INVALID_CURRENCY'
      );
    }

    const workspaceCurrencies = await workspaceMetaService.getWorkspaceCurrencies(auth.workspaceId);
    const allowedCurrencies = [
      workspaceCurrencies.primary,
      ...(workspaceCurrencies.secondary ? [workspaceCurrencies.secondary] : []),
    ];
    if (!allowedCurrencies.includes(currencyParam)) {
      return errorResponse(
        'Currency must match workspace primary or secondary currency.',
        400,
        'UNSUPPORTED_WORKSPACE_CURRENCY'
      );
    }
    const currency = currencyParam as Currency;
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 100;
    const offset = offsetParam ? Number.parseInt(offsetParam, 10) : 0;

    try {
      validatePeriod(period, range);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Invalid period format.';
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

    // 3. Fetch category transactions
    const categoryTransactionsData = await reportService.getCategoryTransactions(
      auth.workspaceId,
      categoryId,
      period,
      range,
      currency,
      {
        limit,
        offset,
      }
    );

    // 4. Transform transactions to TransactionOutput format
    const transactions = categoryTransactionsData.transactions.map((txn) => ({
      id: txn.id,
      amount: String(txn.amount),
      currency: txn.currency,
      type: 'expense' as const,
      transaction_date: txn.transactionDate,
      description: txn.description || '',
      category: {
        id: categoryId,
        name: categoryName,
        type: 'expense' as const,
      },
      account: {
        id: '', // Account ID not available in CategoryTransaction
        name: txn.accountName,
        type: 'bank',
        currency: txn.currency,
      },
      created_at: txn.transactionDate,
      updated_at: txn.transactionDate,
      updated_by_user_id: null,
      deleted_by_user_id: null,
      deleted_at: null,
      has_history: Boolean(txn.hasHistory),
      created_by_user_name: txn.createdByName ?? null,
    }));

    // 5. Check if HTML rendering is requested
    const renderFormat = url.searchParams.get('_render');

    if (renderFormat === 'html') {
      // Create Astro container for server-side rendering
      const container = await AstroContainer.create();

      // Render complete modal content with CategoryIcon
      const html = await container.renderToString(CategoryDrillDownPartial, {
        props: {
          categoryId,
          categoryName,
          categoryIcon,
          categoryColor,
          spent,
          budgetLimit,
          period,
          currency,
          transactions,
          total: categoryTransactionsData.totalCount,
          limit: categoryTransactionsData.limit,
          offset: categoryTransactionsData.offset,
          hasMore: categoryTransactionsData.hasMore,
        },
      });

      return render.html(html);
    }

    // 6. Return JSON response
    return successResponse({
      categoryId,
      categoryName,
      categoryIcon,
      categoryColor,
      spent,
      budgetLimit,
      period,
      currency,
      transactions,
      total: categoryTransactionsData.totalCount,
      totalAmount: categoryTransactionsData.total,
      limit: categoryTransactionsData.limit,
      offset: categoryTransactionsData.offset,
      hasMore: categoryTransactionsData.hasMore,
    });
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
    logError('Error fetching category drilldown', error);
    return errorResponse('Failed to fetch category drilldown', 500, 'INTERNAL_ERROR');
  }
};
