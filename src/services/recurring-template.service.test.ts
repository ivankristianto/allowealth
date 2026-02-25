import { beforeEach, describe, expect, it } from 'bun:test';
import { RecurringTemplateService } from './recurring-template.service';
import {
  createMockAccount,
  createMockCategory,
  createMockDatabase,
  createMockRecurringOccurrence,
  createMockRecurringTemplate,
  resetMockDatabase,
} from './test-helpers/mocks';

describe('RecurringTemplateService', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let recurringTemplateService: RecurringTemplateService;

  beforeEach(() => {
    mockDb = createMockDatabase();
    recurringTemplateService = new RecurringTemplateService(mockDb);
    resetMockDatabase(mockDb);
  });

  it('rejects create when neither end_date nor total_occurrences is provided', async () => {
    await expect(
      recurringTemplateService.create({
        workspace_id: 'workspace-1',
        created_by_user_id: 'user-1',
        name: 'Rent',
        type: 'expense',
        amount: '5000000',
        currency: 'IDR',
        category_id: 'cat-1',
        account_id: 'account-1',
        day_of_month: 1,
        start_date: '2026-01-01',
        is_installment: false,
        starting_occurrence_number: 1,
      })
    ).rejects.toThrow('At least one end condition is required');
  });

  it('creates template and generates initial occurrences', async () => {
    const template = createMockRecurringTemplate();
    const category = createMockCategory();
    const account = createMockAccount();

    (mockDb.query.recurringTemplates.findFirst as any)
      .mockResolvedValueOnce(template)
      .mockResolvedValueOnce({
        ...template,
        category,
        account,
      });

    (mockDb.query.recurringOccurrences.findFirst as any).mockResolvedValueOnce(undefined);
    (mockDb.query.recurringOccurrences.findMany as any).mockResolvedValueOnce([
      createMockRecurringOccurrence(),
    ]);

    const result = await recurringTemplateService.create({
      workspace_id: 'workspace-1',
      created_by_user_id: 'user-1',
      name: 'Rent',
      type: 'expense',
      amount: '5000000',
      currency: 'IDR',
      category_id: 'cat-1',
      account_id: 'account-1',
      day_of_month: 1,
      start_date: '2026-01-01',
      total_occurrences: 12,
      is_installment: false,
      starting_occurrence_number: 1,
    });

    expect(result.id).toBeDefined();
    expect(result.pendingCount).toBe(1);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('cancels template and deletes only future pending occurrences', async () => {
    const template = createMockRecurringTemplate();
    const category = createMockCategory();
    const account = createMockAccount();

    (mockDb.query.recurringTemplates.findFirst as any)
      .mockResolvedValueOnce({
        ...template,
        category,
        account,
      })
      .mockResolvedValueOnce({
        ...template,
        status: 'cancelled',
        category,
        account,
      });

    (mockDb.query.recurringOccurrences.findMany as any)
      .mockResolvedValueOnce([
        createMockRecurringOccurrence({ due_date: '2026-01-01', status: 'pending' }),
      ])
      .mockResolvedValueOnce([
        createMockRecurringOccurrence({
          id: 'future-1',
          due_date: '2099-01-01',
          status: 'pending',
        }),
        createMockRecurringOccurrence({ id: 'past-1', due_date: '2026-01-01', status: 'pending' }),
      ])
      .mockResolvedValueOnce([
        createMockRecurringOccurrence({ due_date: '2026-01-01', status: 'pending' }),
      ]);

    const result = await recurringTemplateService.cancel('rt-1', 'workspace-1');

    expect(result.status).toBe('cancelled');
    expect(mockDb.delete).toHaveBeenCalledTimes(1);
  });

  it('generateOccurrences is idempotent', async () => {
    const template = createMockRecurringTemplate({
      total_occurrences: 1,
      start_date: '2026-01-01',
    });

    (mockDb.query.recurringTemplates.findMany as any)
      .mockResolvedValueOnce([template])
      .mockResolvedValueOnce([template]);

    (mockDb.query.recurringOccurrences.findFirst as any)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(createMockRecurringOccurrence({ occurrence_number: 1 }));

    const first = await recurringTemplateService.generateOccurrences('workspace-1');
    const second = await recurringTemplateService.generateOccurrences('workspace-1');

    expect(first.created).toBeGreaterThan(0);
    expect(second.created).toBe(0);
  });
});
