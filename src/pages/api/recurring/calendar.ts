import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { recurringOccurrenceService, RecurringServiceError, ServiceError } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { createRenderHelper } from '@/lib/api/renderResponse';
import RecurringCalendarPartial from '@/components/partials/RecurringCalendarPartial.astro';

function parseYear(value: string | null): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed >= 2000 && parsed <= 2100
    ? parsed
    : new Date().getFullYear();
}

function parseMonth(value: string | null): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 12
    ? parsed
    : new Date().getMonth() + 1;
}

export const GET: APIRoute = async (context) => {
  const render = createRenderHelper(context.url);

  try {
    const auth = getAuthenticatedUser(context);

    const year = parseYear(context.url.searchParams.get('year'));
    const month = parseMonth(context.url.searchParams.get('month'));

    const calendarData = await recurringOccurrenceService.getCalendarData(
      auth.workspaceId,
      year,
      month
    );

    if (render.wantsHtml()) {
      const container = await AstroContainer.create();
      const html = await container.renderToString(RecurringCalendarPartial, {
        props: {
          calendarData,
          year,
          month,
        },
      });
      return render.html(html);
    }

    return successResponse(calendarData);
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
      ? render.error('Failed to fetch recurring calendar', 500)
      : errorResponse('Failed to fetch recurring calendar', 500);
  }
};
