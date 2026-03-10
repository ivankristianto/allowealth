import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test';
import { categoryService } from '@/services';

let POST: any;

// Store originals
const originalCreate = categoryService.create;
const originalFindAll = categoryService.findAll;
const originalExistsByName = categoryService.existsByName;

function createApiContext(method: 'GET' | 'POST', body?: unknown) {
  return {
    request: new Request('http://localhost/api/categories', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    url: new URL('http://localhost/api/categories'),
    locals: {
      user: { id: 'user-1', workspaceId: 'ws-1', role: 'admin' },
      perf: undefined,
    },
  } as any;
}

describe('/api/categories income_source_type contract', () => {
  beforeAll(async () => {
    ({ POST } = await import('@/pages/api/categories/index'));
  });

  afterEach(() => {
    categoryService.create = originalCreate;
    categoryService.findAll = originalFindAll;
    categoryService.existsByName = originalExistsByName;
  });

  it('creates income categories with income_source_type', async () => {
    categoryService.existsByName = mock(async () => false) as any;
    categoryService.create = mock(async (input: any) => ({
      id: 'cat-new',
      ...input,
      income_source_type: input.income_source_type ?? 'other',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    })) as any;

    const response = await POST(
      createApiContext('POST', {
        name: 'Salary',
        type: 'income',
        income_source_type: 'active',
        description: 'Main salary',
        icon: 'banknote',
        color: 'bg-success',
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(201);
    const callArgs = (categoryService.create as any).mock.calls[0][0];
    expect(callArgs.income_source_type).toBe('active');
    expect(payload.data.income_source_type).toBe('active');
  });

  it('defaults income_source_type to other for expense categories', async () => {
    categoryService.existsByName = mock(async () => false) as any;
    categoryService.create = mock(async (input: any) => ({
      id: 'cat-exp',
      ...input,
      income_source_type: input.income_source_type ?? 'other',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    })) as any;

    const response = await POST(
      createApiContext('POST', {
        name: 'Food',
        type: 'expense',
        icon: 'shopping-basket',
        color: 'bg-info',
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.income_source_type).toBe('other');
  });
});
