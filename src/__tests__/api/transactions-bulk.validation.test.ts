import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test';
import { transactionService } from '@/services';

let POST: any;

const originalBulkUpdateCategory = transactionService.bulkUpdateCategory;
const originalBulkUpdateAccount = transactionService.bulkUpdateAccount;
const originalBulkDelete = transactionService.bulkDelete;

function hasNormalizedIssue(details: any[], path: string[]) {
  return details.some(
    (issue) =>
      JSON.stringify(issue.path) === JSON.stringify(path) &&
      typeof issue.message === 'string' &&
      typeof issue.code === 'string'
  );
}

function createApiContext(body: unknown) {
  return {
    request: new Request('http://localhost/api/transactions/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    locals: {
      user: {
        id: 'user-1',
        workspaceId: 'workspace-1',
        role: 'member',
      },
    },
  } as any;
}

describe('POST /api/transactions/bulk validation', () => {
  beforeAll(async () => {
    ({ POST } = await import('@/pages/api/transactions/bulk'));
  });

  afterEach(() => {
    transactionService.bulkUpdateCategory = originalBulkUpdateCategory;
    transactionService.bulkUpdateAccount = originalBulkUpdateAccount;
    transactionService.bulkDelete = originalBulkDelete;
  });

  it('returns normalized validation details for invalid bulk payloads', async () => {
    const response = await POST(
      createApiContext({
        action: 'update_category',
        ids: [],
        payload: {},
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
    expect(hasNormalizedIssue(payload.error.details, ['ids'])).toBe(true);
    expect(hasNormalizedIssue(payload.error.details, ['payload', 'category_id'])).toBe(true);
  });

  it('still accepts valid bulk category updates', async () => {
    transactionService.bulkUpdateCategory = mock(async () => ({
      updated: 2,
    })) as any;

    const response = await POST(
      createApiContext({
        action: 'update_category',
        ids: ['txn-1', 'txn-2'],
        payload: { category_id: 'cat-1' },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(transactionService.bulkUpdateCategory).toHaveBeenCalledWith(
      ['txn-1', 'txn-2'],
      'cat-1',
      'workspace-1',
      'user-1'
    );
  });
});
