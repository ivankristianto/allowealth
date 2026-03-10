import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test';
import { categoryService } from '@/services';

let PUT: any;

const originalUpdate = categoryService.update;
const originalExistsByName = categoryService.existsByName;

function createApiContext(method: 'PUT', body?: unknown) {
  return {
    request: new Request('http://localhost/api/categories/cat-1', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    url: new URL('http://localhost/api/categories/cat-1'),
    params: { id: 'cat-1' },
    locals: {
      user: { id: 'user-1', workspaceId: 'ws-1', role: 'admin' },
      perf: undefined,
    },
  } as any;
}

describe('/api/categories/[id] income_source_type contract', () => {
  beforeAll(async () => {
    ({ PUT } = await import('@/pages/api/categories/[id]'));
  });

  afterEach(() => {
    categoryService.update = originalUpdate;
    categoryService.existsByName = originalExistsByName;
  });

  it('updates income_source_type on existing income categories', async () => {
    categoryService.update = mock(async (_id: string, _ws: string, input: any) => ({
      id: 'cat-1',
      name: 'Salary',
      type: 'income',
      ...input,
      income_source_type: input.income_source_type ?? 'other',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    })) as any;

    const response = await PUT(
      createApiContext('PUT', {
        income_source_type: 'passive',
      })
    );

    expect(response.status).toBe(200);
    const callArgs = (categoryService.update as any).mock.calls[0];
    expect(callArgs[0]).toBe('cat-1');
    expect(callArgs[1]).toBe('ws-1');
    expect(callArgs[2].income_source_type).toBe('passive');
  });
});
