import { afterEach, describe, expect, it, mock } from 'bun:test';
import { POST } from '@/pages/api/onboarding/budgets';
import { budgetService, BudgetServiceError, ServiceErrorCode } from '@/services';

interface TestLocalsUser {
  id: string;
  workspaceId: string;
  role: 'admin' | 'member';
}

function hasNormalizedIssue(details: any[], path: string[]) {
  return details.some(
    (issue) =>
      JSON.stringify(issue.path) === JSON.stringify(path) &&
      typeof issue.message === 'string' &&
      typeof issue.code === 'string'
  );
}

function createApiContext(body: unknown, user?: TestLocalsUser) {
  return {
    request: new Request('http://localhost/api/onboarding/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    locals: { user },
  } as any;
}

describe('POST /api/onboarding/budgets', () => {
  const originalCreateBudget = budgetService.createBudget;
  const originalFindAllBudgets = budgetService.findAllBudgets;
  const originalUpdateBudget = budgetService.updateBudget;

  afterEach(() => {
    budgetService.createBudget = originalCreateBudget;
    budgetService.findAllBudgets = originalFindAllBudgets;
    budgetService.updateBudget = originalUpdateBudget;
  });

  it('returns normalized validation details for invalid budget payloads', async () => {
    const response = await POST(
      createApiContext(
        {
          budgets: [{ categoryId: '', amount: 'abc', currency: 'IDR' }],
          month: 13,
          year: 2026,
        },
        { id: 'user-1', workspaceId: 'workspace-1', role: 'member' }
      )
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
    expect(hasNormalizedIssue(payload.error.details, ['budgets', '0', 'categoryId'])).toBe(true);
    expect(hasNormalizedIssue(payload.error.details, ['budgets', '0', 'amount'])).toBe(true);
  });

  it('maps budget service errors to API responses', async () => {
    budgetService.createBudget = mock(async () => {
      throw new BudgetServiceError(
        ServiceErrorCode.CATEGORY_NOT_FOUND,
        'Category not found or inactive',
        404
      );
    }) as any;

    const response = await POST(
      createApiContext(
        {
          budgets: [{ categoryId: 'cat-1', amount: '100000', currency: 'IDR' }],
          month: 3,
          year: 2026,
        },
        { id: 'user-1', workspaceId: 'workspace-1', role: 'member' }
      )
    );

    expect(response.status).toBe(404);
    const payload = await response.json();
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe(ServiceErrorCode.CATEGORY_NOT_FOUND);
    expect(payload.error.message).toBe('Category not found or inactive');
  });

  it('is idempotent when onboarding budgets already exist', async () => {
    budgetService.createBudget = mock(async () => {
      throw new BudgetServiceError(
        ServiceErrorCode.BUDGET_ALREADY_EXISTS,
        'Budget already exists',
        409
      );
    }) as any;

    budgetService.findAllBudgets = mock(async () => [
      {
        id: 'budget-1',
        workspace_id: 'workspace-1',
        created_by_user_id: 'user-1',
        category_id: 'cat-1',
        month: 3,
        year: 2026,
        budget_amount: '100000',
        currency: 'IDR',
        notes: null,
        is_closed: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]) as any;

    budgetService.updateBudget = mock(async () => ({
      id: 'budget-1',
    })) as any;

    const response = await POST(
      createApiContext(
        {
          budgets: [{ categoryId: 'cat-1', amount: '150000', currency: 'IDR' }],
          month: 3,
          year: 2026,
        },
        { id: 'user-1', workspaceId: 'workspace-1', role: 'member' }
      )
    );

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.data.created).toBe(0);
    expect(payload.data.updated).toBe(1);
  });
});
