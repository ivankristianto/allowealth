import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import {
  recurringOccurrenceService,
  recurringTemplateService,
  RecurringServiceError,
  ServiceError,
} from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { createRenderHelper } from '@/lib/api/renderResponse';
import RecurringPendingListPartial from '@/components/partials/RecurringPendingListPartial.astro';

type StatusFilter = 'pending' | 'confirmed' | 'skipped' | 'all';

function parseStatusFilter(value: string | null): StatusFilter {
  if (value === 'pending' || value === 'confirmed' || value === 'skipped') return value;
  return 'all';
}

function parseMonth(value: string | null): string {
  if (value && /^\d{4}-\d{2}$/.test(value)) return value;
  return new Date().toISOString().slice(0, 7);
}

function toMonthLabel(month: string): string {
  const [yearRaw, monthRaw] = month.split('-').map(Number);
  const date = new Date(yearRaw, monthRaw - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export const GET: APIRoute = async (context) => {
  const render = createRenderHelper(context.url);

  try {
    const auth = getAuthenticatedUser(context);
    const perf = context.locals.perf;

    const month = parseMonth(context.url.searchParams.get('month'));
    const status = parseStatusFilter(context.url.searchParams.get('status'));
    const dueWithin = context.url.searchParams.get('due_within') || undefined;

    const result = await recurringOccurrenceService.findPending(
      auth.workspaceId,
      {
        month,
        status,
        due_within: dueWithin,
      },
      perf
    );

    if (render.wantsHtml()) {
      const container = await AstroContainer.create();
      const templateCheck = await recurringTemplateService.findAll(auth.workspaceId, {
        status: 'all',
        page: 1,
        limit: 1,
      });

      const html = await container.renderToString(RecurringPendingListPartial, {
        props: {
          occurrences: result.occurrences,
          hasTemplates: templateCheck.total > 0,
          monthLabel: toMonthLabel(month),
        },
      });

      return render.html(html);
    }

    return successResponse(result);
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
      ? render.error('Failed to fetch recurring occurrences', 500)
      : errorResponse('Failed to fetch recurring occurrences', 500);
  }
};
