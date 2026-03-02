import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { TransactionService } from '@/services/transaction.service';
import { createMockDatabase, resetMockDatabase } from '@/services/test-helpers/mocks';

describe('Transaction bulk invalidation strategy', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let transactionService: TransactionService;

  beforeEach(() => {
    mockDb = createMockDatabase();
    transactionService = new TransactionService(mockDb);
    resetMockDatabase(mockDb);
  });

  it('bulkUpdateCategory performs one final invalidation after per-item updates', async () => {
    (transactionService as any).categoryService.findById = mock(async () => ({
      id: 'cat-1',
      is_active: true,
    }));
    (transactionService as any).updateInternal = mock(async () => ({ id: 'tx' }));
    (transactionService as any).invalidateWorkspaceCaches = mock(async () => {});

    const result = await transactionService.bulkUpdateCategory(
      ['tx-1', 'tx-2', 'tx-3'],
      'cat-1',
      'ws-1',
      'user-1'
    );

    expect(result.updated).toBe(3);
    expect((transactionService as any).updateInternal).toHaveBeenCalledTimes(3);
    expect((transactionService as any).invalidateWorkspaceCaches).toHaveBeenCalledTimes(1);
  });

  it('bulkDelete performs one final invalidation after per-item deletes', async () => {
    (transactionService as any).deleteInternal = mock(async () => ({ success: true }));
    (transactionService as any).invalidateWorkspaceCaches = mock(async () => {});

    const result = await transactionService.bulkDelete(['tx-1', 'tx-2'], 'ws-1', 'user-1');

    expect(result.updated).toBe(2);
    expect((transactionService as any).deleteInternal).toHaveBeenCalledTimes(2);
    expect((transactionService as any).invalidateWorkspaceCaches).toHaveBeenCalledTimes(1);
  });
});
