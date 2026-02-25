import { beforeEach, describe, expect, it } from 'bun:test';
import { RecurringOccurrenceService } from './recurring-occurrence.service';
import { RecurringServiceError } from './service-errors';
import {
  createMockAccount,
  createMockCategory,
  createMockDatabase,
  createMockRecurringOccurrence,
  createMockRecurringTemplate,
  resetMockDatabase,
} from './test-helpers/mocks';

describe('RecurringOccurrenceService', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let recurringOccurrenceService: RecurringOccurrenceService;

  beforeEach(() => {
    mockDb = createMockDatabase();
    recurringOccurrenceService = new RecurringOccurrenceService(mockDb);
    resetMockDatabase(mockDb);
  });

  it('findPending returns pending occurrences sorted by due date', async () => {
    const template = {
      ...createMockRecurringTemplate(),
      category: createMockCategory(),
      account: createMockAccount(),
    };

    (mockDb.query.recurringOccurrences.findMany as any).mockResolvedValueOnce([
      {
        ...createMockRecurringOccurrence({ due_date: '2026-01-01', status: 'pending' }),
        template,
      },
      {
        ...createMockRecurringOccurrence({ id: 'ro-2', due_date: '2026-01-05', status: 'pending' }),
        template,
      },
    ]);

    const result = await recurringOccurrenceService.findPending('workspace-1', {
      month: '2026-02',
      status: 'pending',
    });

    expect(result.total).toBe(2);
    expect(result.occurrences[0]?.due_date).toBe('2026-01-01');
    expect(result.occurrences[1]?.due_date).toBe('2026-01-05');
  });

  it('findPending excludes pending occurrences from non-active templates', async () => {
    const activeTemplate = {
      ...createMockRecurringTemplate({ status: 'active' }),
      category: createMockCategory(),
      account: createMockAccount(),
    };
    const pausedTemplate = {
      ...createMockRecurringTemplate({ id: 'rt-2', status: 'paused' }),
      category: createMockCategory({ id: 'cat-2' }),
      account: createMockAccount({ id: 'account-2' }),
    };

    (mockDb.query.recurringOccurrences.findMany as any).mockResolvedValueOnce([
      {
        ...createMockRecurringOccurrence({ id: 'ro-1', template_id: 'rt-1', status: 'pending' }),
        template: activeTemplate,
      },
      {
        ...createMockRecurringOccurrence({ id: 'ro-2', template_id: 'rt-2', status: 'pending' }),
        template: pausedTemplate,
      },
    ]);

    const result = await recurringOccurrenceService.findPending('workspace-1', {
      month: '2026-01',
      status: 'pending',
    });

    expect(result.total).toBe(1);
    expect(result.occurrences[0]?.template_id).toBe('rt-1');
  });

  it('confirm throws when occurrence is already confirmed', async () => {
    const template = {
      ...createMockRecurringTemplate(),
      category: createMockCategory(),
      account: createMockAccount(),
    };

    (mockDb.query.recurringOccurrences.findFirst as any).mockResolvedValueOnce({
      ...createMockRecurringOccurrence({ status: 'confirmed' }),
      template,
    });

    await expect(
      recurringOccurrenceService.confirm('ro-1', 'workspace-1', {
        amount: '5000000',
        transaction_date: new Date('2026-01-01'),
        category_id: 'cat-1',
        account_id: 'account-1',
        userId: 'user-1',
      })
    ).rejects.toBeInstanceOf(RecurringServiceError);
  });

  it('skip marks a pending occurrence as skipped', async () => {
    const template = {
      ...createMockRecurringTemplate(),
      category: createMockCategory(),
      account: createMockAccount(),
    };

    (mockDb.query.recurringOccurrences.findFirst as any)
      .mockResolvedValueOnce({
        ...createMockRecurringOccurrence({ status: 'pending' }),
        template,
      })
      .mockResolvedValueOnce({
        ...createMockRecurringOccurrence({ status: 'skipped', skip_reason: 'Not needed' }),
        template,
      });

    const result = await recurringOccurrenceService.skip('ro-1', 'workspace-1', 'Not needed');

    expect(result.status).toBe('skipped');
    expect(result.skip_reason).toBe('Not needed');
  });

  it('getStats returns grouped pending totals by currency', async () => {
    const idrTemplate = createMockRecurringTemplate({ amount: '5000000', currency: 'IDR' });
    const usdTemplate = createMockRecurringTemplate({ id: 'rt-2', amount: '100', currency: 'USD' });

    (mockDb.query.recurringOccurrences.findMany as any)
      .mockResolvedValueOnce([
        {
          ...createMockRecurringOccurrence({ due_date: '2026-01-01', status: 'pending' }),
          template: idrTemplate,
        },
        {
          ...createMockRecurringOccurrence({
            id: 'ro-2',
            due_date: '2026-01-02',
            status: 'pending',
          }),
          template: usdTemplate,
        },
      ])
      .mockResolvedValueOnce([createMockRecurringOccurrence({ id: 'ro-3', status: 'confirmed' })]);

    const stats = await recurringOccurrenceService.getStats('workspace-1');

    expect(stats.pendingCount).toBe(2);
    expect(stats.pendingByCurrency).toHaveLength(2);
    expect(stats.confirmedThisMonth).toBe(1);
  });

  it('getStats does not count due-today pending as overdue', async () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const activeTemplate = createMockRecurringTemplate({ status: 'active' });

    (mockDb.query.recurringOccurrences.findMany as any)
      .mockResolvedValueOnce([
        {
          ...createMockRecurringOccurrence({ due_date: todayIso, status: 'pending' }),
          template: activeTemplate,
        },
      ])
      .mockResolvedValueOnce([]);

    const stats = await recurringOccurrenceService.getStats('workspace-2');
    expect(stats.overdueCount).toBe(0);
  });
});
