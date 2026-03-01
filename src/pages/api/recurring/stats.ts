import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { recurringOccurrenceService, RecurringServiceError, ServiceError } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { createRenderHelper } from '@/lib/api/renderResponse';
import RecurringStatsPartial from '@/components/partials/RecurringStatsPartial.astro';

function parseMonth(value: string | null): string {
  if (value && /^\d{4}-\d{2}$/.test(value)) return value;
  return new Date().toISOString().slice(0, 7);
}

export const GET: APIRoute = async (context) => {
  const render = createRenderHelper(context.url);

  try {
    const auth = getAuthenticatedUser(context);
    const month = parseMonth(context.url.searchParams.get('month'));

    if (render.wantsHtml()) {
      const summary = await recurringOccurrenceService.getMonthlySummary(auth.workspaceId, month);

      const container = await AstroContainer.create();
      const html = await container.renderToString(RecurringStatsPartial, {
        props: { summary },
      });
      return render.html(html);
    }

    const stats = await recurringOccurrenceService.getStats(auth.workspaceId);
    return successResponse(stats);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return render.wantsHtml()
        ? render.error('Unauthorized', 401)
        : errorResponse('Unauthorized', 401);
    }

    if (error instanceof RecurringServiceError || error instanceof ServiceError) {
      return render.wantsHtml()
        ? render.error(error.message, error.statusCode)
        : errorResponse(error.message, error.statusCode, error.code);
    }

    return render.wantsHtml()
      ? render.error('Failed to fetch recurring stats', 500)
      : errorResponse('Failed to fetch recurring stats', 500);
  }
};
