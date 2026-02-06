import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { assetService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { createRenderHelper } from '@/lib/api/renderResponse';

// Import partial component for HTML rendering
import AssetHistoryPartial from '@/components/partials/AssetHistoryPartial.astro';

/**
 * GET /api/assets/:id/history
 * Get asset balance history
 * Query params:
 *   - limit: number (optional, defaults to all, max 100)
 *   - _render: 'html' | 'json' (optional, defaults to 'json')
 */
export const GET: APIRoute = async (context) => {
  const { url } = context;
  const render = createRenderHelper(url);

  try {
    const auth = getAuthenticatedUser(context);
    const perf = context.locals.perf;
    const { id } = context.params;

    if (!id) {
      return render.wantsHtml()
        ? render.error('Asset ID is required', 400)
        : errorResponse('Asset ID is required', 400);
    }

    // Parse optional limit param
    const limitParam = url.searchParams.get('limit');
    const parsedLimit = limitParam ? parseInt(limitParam, 10) : NaN;
    const limit = !isNaN(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : undefined;

    const history = await assetService.getHistory(id, auth.workspaceId, perf, limit);

    // Check if HTML rendering is requested
    if (render.wantsHtml()) {
      const container = await AstroContainer.create();
      const html = await container.renderToString(AssetHistoryPartial, {
        props: {
          entries: history,
          assetId: id,
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
    if (error instanceof Error && error.message === 'Asset not found') {
      return render.wantsHtml()
        ? render.error('Asset not found', 404)
        : errorResponse('Asset not found', 404);
    }
    logError('Error fetching asset history', error);
    return render.wantsHtml()
      ? render.error('Failed to fetch asset history', 500)
      : errorResponse('Failed to fetch asset history', 500);
  }
};
