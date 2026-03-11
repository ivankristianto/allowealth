import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { safeParse } from 'valibot';
import { transactionService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { transactionIdSchema } from '@/lib/validation/transactions';
import { logError } from '@/lib/utils';
import { ServiceError } from '@/services/service-errors';
import {
  HTML_RENDER_REQUEST_REQUIRED_MESSAGE,
  createRenderHelper,
  isRejectedHtmlRenderRequest,
} from '@/lib/api/renderResponse';
import TransactionHistoryPartial from '@/components/partials/TransactionHistoryPartial.astro';

/**
 * GET /api/transactions/:id/history
 * Get audit history for a transaction
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;
    const { url } = context;
    const render = createRenderHelper(url, context.request);
    if (isRejectedHtmlRenderRequest(url, context.request)) {
      return render.error(HTML_RENDER_REQUEST_REQUIRED_MESSAGE, 403);
    }

    const idValidation = safeParse(transactionIdSchema, id);
    if (!idValidation.success) {
      return errorResponse('Invalid transaction ID format', 400);
    }

    const showAll = url.searchParams.get('all') === 'true';

    const result = await transactionService.getHistory(
      idValidation.output,
      auth.workspaceId,
      showAll
    );

    if (render.wantsHtml()) {
      const container = await AstroContainer.create();
      const html = await container.renderToString(TransactionHistoryPartial, {
        props: {
          history: result.history,
          totalEdits: result.totalEdits,
          showingEdits: result.showingEdits,
          transactionId: idValidation.output,
        },
      });
      return render.html(html);
    }

    return successResponse(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof ServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error fetching transaction history', error);
    return errorResponse('Failed to fetch transaction history', 500);
  }
};
