import { afterEach, describe, expect, it, mock } from 'bun:test';
import { POST } from './initialize';
import { budgetService, BudgetServiceError, ServiceErrorCode } from '@/services';

interface TestLocalsUser {
  id: string;
  workspaceId: string;
  role: 'admin' | 'member';
}

function createApiContext(body: unknown, user?: TestLocalsUser) {
  return {
    request: new Request('http://localhost/api/budgets/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    locals: { user },
  } as any;
}

describe('POST /api/budgets/initialize', () => {
  const originalInitializeAllBudgets = budgetService.initializeAllBudgets;

  afterEach(() => {
    budgetService.initializeAllBudgets = originalInitializeAllBudgets;
  });

  it('returns 200 with initialized count', async () => {
    budgetService.initializeAllBudgets = mock(async () => ({
      initialized_count: 2,
      categories: [
        { id: 'cat-1', name: 'Food' },
        { id: 'cat-2', name: 'Transport' },
      ],
    })) as any;

    const response = await POST(
      createApiContext(
        {
          month: 2,
          year: 2026,
          currency: 'IDR',
        },
        { id: 'user-1', workspaceId: 'workspace-1', role: 'member' }
      )
    );

    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.data.initialized_count).toBe(2);
    expect(payload.data.categories).toHaveLength(2);
  });

  it('returns 400 for invalid month', async () => {
    const response = await POST(
      createApiContext(
        {
          month: 13,
          year: 2026,
          currency: 'IDR',
        },
        { id: 'user-1', workspaceId: 'workspace-1', role: 'member' }
      )
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 for unauthenticated requests', async () => {
    const response = await POST(
      createApiContext({
        month: 2,
        year: 2026,
        currency: 'IDR',
      })
    );

    expect(response.status).toBe(401);
    const payload = await response.json();
    expect(payload.success).toBe(false);
    expect(payload.error.message).toBe('Unauthorized');
  });

  it('maps service errors to API error responses', async () => {
    budgetService.initializeAllBudgets = mock(async () => {
      throw new BudgetServiceError(ServiceErrorCode.VALIDATION_ERROR, 'Invalid parameters', 400);
    }) as any;

    const response = await POST(
      createApiContext(
        {
          month: 2,
          year: 2026,
          currency: 'IDR',
        },
        { id: 'user-1', workspaceId: 'workspace-1', role: 'member' }
      )
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe(ServiceErrorCode.VALIDATION_ERROR);
    expect(payload.error.message).toBe('Invalid parameters');
  });
});
