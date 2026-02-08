import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { transactionService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  getPaginationParams,
  isValidDate,
  isValidationError,
} from '@/lib/api-utils';
import { createTransactionAPISchema } from '@/lib/validation';
import { logError, transformTransaction, safeParseAmount, formatMonthKey } from '@/lib/utils';
import { PAGINATION } from '@/lib/constants/pagination';
import { createRenderHelper } from '@/lib/api/renderResponse';

// Import partial components for HTML rendering
import TransactionListPartial from '@/components/partials/TransactionListPartial.astro';
import TransactionSummaryPartial from '@/components/partials/TransactionSummaryPartial.astro';
import PaginationPartial from '@/components/partials/PaginationPartial.astro';

/**
 * GET /api/transactions
 * List all transactions with optional filters
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const perf = context.locals.perf;
    const { url } = context;

    const { limit, offset } = getPaginationParams(url);

    // Parse filter params
    const filters: any = {
      workspace_id: auth.workspaceId,
      limit,
      offset,
    };

    const type = url.searchParams.get('type');
    if (type && (type === 'expense' || type === 'income')) {
      filters.type = type;
    }

    const categoryId = url.searchParams.get('category_id');
    if (categoryId) {
      filters.category_id = categoryId;
    }

    // Handle multiple category IDs (comma-separated)
    const categoryIds = url.searchParams.get('category_ids');
    if (categoryIds) {
      filters.category_ids = categoryIds.split(',').filter(Boolean);
    }

    const assetId = url.searchParams.get('asset_id');
    if (assetId) {
      filters.asset_id = assetId;
    }

    const currency = url.searchParams.get('currency');
    if (currency && (currency === 'IDR' || currency === 'USD')) {
      filters.currency = currency;
    }

    const startDate = url.searchParams.get('start_date');
    if (startDate) {
      const parsedStartDate = new Date(startDate);
      if (!isValidDate(parsedStartDate)) {
        return errorResponse('Invalid start_date format', 400);
      }
      filters.start_date = parsedStartDate;
    }

    const endDate = url.searchParams.get('end_date');
    if (endDate) {
      const parsedEndDate = new Date(endDate);
      if (!isValidDate(parsedEndDate)) {
        return errorResponse('Invalid end_date format', 400);
      }
      filters.end_date = parsedEndDate;
    }

    const search = url.searchParams.get('search');
    if (search) {
      filters.search = search;
    }

    // Include soft-deleted transactions in the list for audit trail visibility
    filters.include_deleted = true;
    const rawTransactions = await transactionService.findAll(filters, perf);
    const total = await transactionService.count(filters, perf);

    // Transform to TransactionOutput format
    const transactions = rawTransactions.map(transformTransaction);

    // Enrich with has_history flag for conditional history icon
    const transactionIds: string[] = transactions.map((t) => t.id);
    const idsWithHistory: Set<string> = await transactionService.getTransactionIdsWithHistory(
      auth.workspaceId,
      transactionIds
    );
    for (const t of transactions) {
      t.has_history = idsWithHistory.has(t.id);
    }

    // Calculate month-based summary (only uses date range, not other filters)
    // This summary stays constant regardless of type/category/search filters
    let monthSummary = null;
    if (filters.start_date && filters.end_date) {
      const monthTransactions = await transactionService.findAll({
        workspace_id: auth.workspaceId,
        start_date: filters.start_date,
        end_date: filters.end_date,
        include_deleted: false,
        limit: PAGINATION.MAX_MONTH_TRANSACTIONS,
      });

      let income = 0;
      let expenses = 0;
      let expenseCount = 0;

      monthTransactions.forEach((t: any) => {
        const amount = safeParseAmount(t.amount);
        if (t.type === 'income') {
          income += amount;
        } else {
          expenses += Math.abs(amount);
          expenseCount++;
        }
      });

      monthSummary = {
        income,
        expenses,
        transactionCount: expenseCount,
      };
    }

    // Check if HTML rendering is requested
    const render = createRenderHelper(url);

    if (render.wantsHtml()) {
      // Render HTML fragments using Astro Container API
      const container = await AstroContainer.create();

      // Get the requested partial (_partial param: list, summary, pagination, or all)
      const partial = url.searchParams.get('_partial') || 'list';
      const page = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(total / limit);

      // Get currency from user settings or default
      const currencyParam = (url.searchParams.get('_currency') as 'IDR' | 'USD') || 'IDR';

      // Generate period label from date range
      let periodLabel = '';
      if (filters.start_date) {
        const monthKey = `${String(filters.start_date.getMonth() + 1).padStart(2, '0')}-${filters.start_date.getFullYear()}`;
        periodLabel = formatMonthKey(monthKey);
      }

      const htmlParts: string[] = [];

      // Render requested partial(s)
      if (partial === 'all' || partial === 'summary') {
        if (monthSummary) {
          const summaryHtml = await container.renderToString(TransactionSummaryPartial, {
            props: {
              monthlyIncome: monthSummary.income,
              monthlyExpenses: monthSummary.expenses,
              transactionCount: monthSummary.transactionCount,
              periodLabel,
              currency: currencyParam,
            },
          });
          htmlParts.push(`<!-- PARTIAL:summary -->\n${summaryHtml}`);
        }
      }

      if (partial === 'all' || partial === 'list') {
        const listHtml = await container.renderToString(TransactionListPartial, {
          props: {
            transactions,
            showActions: true,
          },
        });
        htmlParts.push(`<!-- PARTIAL:list -->\n${listHtml}`);
      }

      if (partial === 'all' || partial === 'pagination') {
        const paginationHtml = await container.renderToString(PaginationPartial, {
          props: {
            total,
            limit,
            offset,
            page,
            totalPages,
          },
        });
        htmlParts.push(`<!-- PARTIAL:pagination -->\n${paginationHtml}`);
      }

      return render.html(htmlParts.join('\n'));
    }

    // Default: Return JSON response
    return successResponse({
      transactions,
      pagination: {
        limit,
        offset,
        total,
      },
      ...(monthSummary && { summary: monthSummary }),
    });
  } catch (error) {
    const render = createRenderHelper(context.url);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return render.wantsHtml()
        ? render.error('Unauthorized', 401)
        : errorResponse('Unauthorized', 401);
    }
    logError('Error fetching transactions', error);
    return render.wantsHtml()
      ? render.error('Failed to fetch transactions', 500)
      : errorResponse('Failed to fetch transactions', 500);
  }
};

/**
 * POST /api/transactions
 * Create a new transaction
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { request } = context;

    // Validate Content-Type header
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return errorResponse('Content-Type must be application/json', 415, 'UNSUPPORTED_MEDIA_TYPE');
    }

    const validation = await validateBody(request, createTransactionAPISchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    // Convert date string (YYYY-MM-DD) to Date object
    // The validation ensures the string is in the correct format
    const transactionDate = new Date(validation.data.transaction_date + 'T00:00:00.000Z');

    const rawTransaction = await transactionService.create({
      workspace_id: auth.workspaceId,
      created_by_user_id: auth.userId,
      type: validation.data.type,
      amount: validation.data.amount,
      currency: validation.data.currency,
      category_id: validation.data.category_id,
      asset_id: validation.data.asset_id,
      to_asset_id: validation.data.to_asset_id,
      transaction_date: transactionDate,
      description: validation.data.description,
    });

    return successResponse(transformTransaction(rawTransaction), 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error creating transaction', error);
    return errorResponse('Failed to create transaction', 500);
  }
};
