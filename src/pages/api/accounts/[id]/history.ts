import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { accountService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import {
  HTML_RENDER_REQUEST_REQUIRED_MESSAGE,
  createRenderHelper,
  isRejectedHtmlRenderRequest,
} from '@/lib/api/renderResponse';

// Import partial component for HTML rendering
import AccountHistoryPartial from '@/components/partials/AccountHistoryPartial.astro';

/**
 * GET /api/accounts/:id/history
 * Get account balance history
 * Query params:
 *   - limit: number (optional, default 100, max 500)
 *   - _render: 'html' | 'json' (optional, defaults to 'json')
 */
export const GET: APIRoute = async (context) => {
  const { url } = context;
  const render = createRenderHelper(url, context.request);
  if (isRejectedHtmlRenderRequest(url, context.request)) {
    return render.error(HTML_RENDER_REQUEST_REQUIRED_MESSAGE, 403);
  }

  try {
    const auth = getAuthenticatedUser(context);
    const perf = context.locals.perf;
    const { id } = context.params;

    if (!id) {
      return render.wantsHtml()
        ? render.error('Account ID is required', 400)
        : errorResponse('Account ID is required', 400);
    }

    // Parse optional limit param
    const limitParam = url.searchParams.get('limit');
    const parsedLimit = limitParam ? parseInt(limitParam, 10) : NaN;
    const limit = !isNaN(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 500) : 100;

    const history = await accountService.getHistory(id, auth.workspaceId, perf, limit);

    // Check if HTML rendering is requested
    if (render.wantsHtml()) {
      const account = await accountService.findByIdIncludingClosed(id, auth.workspaceId);
      if (!account) {
        return render.error('Account not found', 404);
      }
      const container = await AstroContainer.create();
      const html = await container.renderToString(AccountHistoryPartial, {
        props: {
          entries: history,
          accountId: id,
          currency: account.currency,
        },
      });
      return render.html(html);
    }

    // Default: JSON response
    return successResponse(history);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return render.wantsHtml()
        ? render.error('Unauthorized', 401)
        : errorResponse('Unauthorized', 401);
    }
    if (error instanceof Error && error.message === 'Account not found') {
      return render.wantsHtml()
        ? render.error('Account not found', 404)
        : errorResponse('Account not found', 404);
    }
    logError('Error fetching account history', error);
    return render.wantsHtml()
      ? render.error('Failed to fetch account history', 500)
      : errorResponse('Failed to fetch account history', 500);
  }
};
