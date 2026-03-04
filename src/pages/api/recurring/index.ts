import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { recurringTemplateService, RecurringServiceError, ServiceError } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { createRecurringTemplateAPISchema } from '@/lib/validation/recurring';
import { createRenderHelper } from '@/lib/api/renderResponse';
import RecurringTemplateListPartial from '@/components/partials/RecurringTemplateListPartial.astro';

type StatusFilter = 'active' | 'paused' | 'completed' | 'cancelled' | 'all';
type TypeFilter = 'expense' | 'income' | undefined;

function parseStatusFilter(value: string | null): StatusFilter {
  if (value === 'active' || value === 'paused' || value === 'completed' || value === 'cancelled') {
    return value;
  }
  return 'all';
}

function parseTypeFilter(value: string | null): TypeFilter {
  if (value === 'expense' || value === 'income') return value;
  return undefined;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const GET: APIRoute = async (context) => {
  const render = createRenderHelper(context.url);

  try {
    const auth = getAuthenticatedUser(context);
    const perf = context.locals.perf;

    const status = parseStatusFilter(context.url.searchParams.get('status'));
    const type = parseTypeFilter(context.url.searchParams.get('type'));
    const search = context.url.searchParams.get('search')?.trim() || undefined;
    const page = parsePositiveInt(context.url.searchParams.get('page'), 1);
    const limit = parsePositiveInt(context.url.searchParams.get('limit'), 10);

    const result = await recurringTemplateService.findAll(
      auth.workspaceId,
      {
        status,
        type,
        search,
        page,
        limit,
      },
      perf
    );

    if (render.wantsHtml()) {
      const container = await AstroContainer.create();
      const html = await container.renderToString(RecurringTemplateListPartial, {
        props: {
          templates: result.templates,
          total: result.total,
          page: result.page,
          limit: result.limit,
          type: type ?? 'all',
          search: search ?? '',
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
      ? render.error('Failed to fetch recurring templates', 500)
      : errorResponse('Failed to fetch recurring templates', 500);
  }
};

export const POST: APIRoute = async (context) => {
  const render = createRenderHelper(context.url);

  try {
    const auth = getAuthenticatedUser(context);

    const contentType = context.request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return errorResponse('Content-Type must be application/json', 415, 'UNSUPPORTED_MEDIA_TYPE');
    }

    const validation = await validateBody(context.request, createRecurringTemplateAPISchema);
    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const payload = validation.data;

    const created = await recurringTemplateService.create({
      workspace_id: auth.workspaceId,
      created_by_user_id: auth.userId,
      name: payload.name,
      type: payload.type,
      amount: payload.amount,
      currency: payload.currency,
      category_id: payload.category_id,
      account_id: payload.account_id,
      day_of_month: Number(payload.day_of_month),
      start_date: payload.start_date,
      end_date: payload.end_date,
      total_occurrences: payload.total_occurrences,
      is_installment: payload.is_installment,
      installment_label: payload.installment_label,
      starting_occurrence_number: Number(payload.starting_occurrence_number || 1),
      description: payload.description,
      status: payload.status,
    });

    if (render.wantsHtml()) {
      return render.json(created, 201);
    }

    return successResponse(created, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }

    if (error instanceof RecurringServiceError || error instanceof ServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }

    return errorResponse('Failed to create recurring template', 500);
  }
};
