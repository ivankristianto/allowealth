import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import {
  recurringOccurrenceService,
  workspaceMetaService,
  RecurringServiceError,
  ServiceError,
} from '@/services';
import { getCurrentDateISO } from '@/lib/utils/date';
import { successResponse, errorResponse, getWorkspaceUser } from '@/lib/api-utils';
import {
  HTML_RENDER_REQUEST_REQUIRED_MESSAGE,
  createRenderHelper,
  isRejectedHtmlRenderRequest,
} from '@/lib/api/renderResponse';
import RecurringCalendarPartial from '@/components/partials/RecurringCalendarPartial.astro';

function parseYear(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed >= 2000 && parsed <= 2100 ? parsed : fallback;
}

function parseMonth(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 12 ? parsed : fallback;
}

export const GET: APIRoute = async (context) => {
  const render = createRenderHelper(context.url, context.request);

  if (isRejectedHtmlRenderRequest(context.url, context.request)) {
    return render.error(HTML_RENDER_REQUEST_REQUIRED_MESSAGE, 403);
  }

  try {
    const auth = getWorkspaceUser(context);

    const todayIso = getCurrentDateISO(await workspaceMetaService.getTimezone(auth.workspaceId));
    const [currentYear, currentMonth] = todayIso.split('-').map(Number);
    const year = parseYear(context.url.searchParams.get('year'), currentYear);
    const month = parseMonth(context.url.searchParams.get('month'), currentMonth);

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
          todayIso,
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
