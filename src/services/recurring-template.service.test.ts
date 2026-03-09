import { beforeEach, describe, expect, it, mock } from 'bun:test';
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

  it('creates open-ended recurring templates', async () => {
    const template = createMockRecurringTemplate({ total_occurrences: null, end_date: null });
    const category = createMockCategory();
    const account = createMockAccount();

    (mockDb.query.categories.findFirst as any).mockResolvedValueOnce(category);
    (mockDb.query.accounts.findFirst as any).mockResolvedValueOnce(account);
    (mockDb.query.recurringTemplates.findFirst as any)
      .mockResolvedValueOnce(template)
      .mockResolvedValueOnce({ ...template, category, account });
    (mockDb.query.recurringOccurrences.findFirst as any).mockResolvedValueOnce(undefined);
    (mockDb.select as any).mockImplementation(() => ({
      from: mock(() => ({
        where: mock(() => ({
          groupBy: mock(() =>
            Promise.resolve([
              {
                template_id: template.id,
                pending_count: 1,
                confirmed_count: 0,
                skipped_count: 0,
                next_due_date: '2026-01-25',
              },
            ])
          ),
        })),
      })),
    }));

    const result = await recurringTemplateService.create({
      workspace_id: 'workspace-1',
      created_by_user_id: 'user-1',
      name: 'Salary',
      type: 'income',
      amount: '15000000',
      currency: 'IDR',
      category_id: 'cat-1',
      account_id: 'account-1',
      day_of_month: 25,
      start_date: '2026-01-25',
      is_installment: false,
      starting_occurrence_number: 1,
    });

    expect(result.id).toBeDefined();
  });

  it('creates template and generates initial occurrences', async () => {
    const template = createMockRecurringTemplate();
    const category = createMockCategory();
    const account = createMockAccount();

    (mockDb.query.categories.findFirst as any).mockResolvedValueOnce(category);
    (mockDb.query.accounts.findFirst as any).mockResolvedValueOnce(account);

    (mockDb.query.recurringTemplates.findFirst as any)
      .mockResolvedValueOnce(template)
      .mockResolvedValueOnce({
        ...template,
        category,
        account,
      });

    (mockDb.query.recurringOccurrences.findFirst as any).mockResolvedValueOnce(undefined);
    (mockDb.select as any).mockImplementation(() => ({
      from: mock(() => ({
        where: mock(() => ({
          groupBy: mock(() =>
            Promise.resolve([
              {
                template_id: template.id,
                pending_count: 1,
                confirmed_count: 0,
                skipped_count: 0,
                next_due_date: '2026-01-01',
              },
            ])
          ),
        })),
      })),
    }));

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

  it('rejects create when category does not belong to workspace', async () => {
    (mockDb.query.categories.findFirst as any).mockResolvedValueOnce(undefined);

    await expect(
      recurringTemplateService.create({
        workspace_id: 'workspace-1',
        created_by_user_id: 'user-1',
        name: 'Rent',
        type: 'expense',
        amount: '5000000',
        currency: 'IDR',
        category_id: 'cat-unknown',
        account_id: 'account-1',
        day_of_month: 1,
        start_date: '2026-01-01',
        total_occurrences: 12,
        is_installment: false,
        starting_occurrence_number: 1,
      })
    ).rejects.toThrow('Category not found');
  });

  it('rejects update when account does not belong to workspace', async () => {
    (mockDb.query.recurringTemplates.findFirst as any).mockResolvedValueOnce(
      createMockRecurringTemplate()
    );
    (mockDb.query.accounts.findFirst as any).mockResolvedValueOnce(undefined);

    await expect(
      recurringTemplateService.update('rt-1', 'workspace-1', {
        workspace_id: 'workspace-1',
        account_id: 'account-foreign',
      })
    ).rejects.toThrow('Account not found');
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

  it('rejects resume when template is not paused', async () => {
    const category = createMockCategory();
    const account = createMockAccount();

    (mockDb.query.recurringTemplates.findFirst as any).mockResolvedValueOnce({
      ...createMockRecurringTemplate({ status: 'cancelled' }),
      category,
      account,
    });
    (mockDb.query.recurringOccurrences.findMany as any).mockResolvedValueOnce([]);

    await expect(recurringTemplateService.resume('rt-1', 'workspace-1')).rejects.toThrow(
      'Only paused templates can be resumed'
    );
  });

  it('rejects enabling installment when merged template has no total_occurrences', async () => {
    (mockDb.query.recurringTemplates.findFirst as any).mockResolvedValueOnce(
      createMockRecurringTemplate({
        total_occurrences: null,
        end_date: '2026-12-31',
        is_installment: false,
      })
    );

    await expect(
      recurringTemplateService.update('rt-1', 'workspace-1', {
        workspace_id: 'workspace-1',
        is_installment: true,
      })
    ).rejects.toThrow('Installments require total occurrences');
  });

  it('rejects update when starting occurrence exceeds merged total occurrences', async () => {
    (mockDb.query.recurringTemplates.findFirst as any).mockResolvedValueOnce(
      createMockRecurringTemplate({
        total_occurrences: 6,
        end_date: null,
      })
    );

    await expect(
      recurringTemplateService.update('rt-1', 'workspace-1', {
        workspace_id: 'workspace-1',
        starting_occurrence_number: 7,
      })
    ).rejects.toThrow('Starting occurrence number must be less than or equal to total occurrences');
  });

  it('rejects direct status mutation in update payload', async () => {
    await expect(
      recurringTemplateService.update('rt-1', 'workspace-1', {
        workspace_id: 'workspace-1',
        status: 'paused',
      } as any)
    ).rejects.toThrow('unrecognized_keys');
  });

  it('allows clearing total_occurrences when the merged template is not an installment', async () => {
    const category = createMockCategory();
    const account = createMockAccount();

    (mockDb.query.recurringTemplates.findFirst as any)
      .mockResolvedValueOnce({
        ...createMockRecurringTemplate({
          total_occurrences: 6,
          end_date: null,
          is_installment: false,
        }),
        category,
        account,
      })
      .mockResolvedValueOnce({
        ...createMockRecurringTemplate({
          total_occurrences: null,
          end_date: null,
          is_installment: false,
        }),
        category,
        account,
      })
      .mockResolvedValueOnce({
        ...createMockRecurringTemplate({
          total_occurrences: null,
          end_date: null,
          is_installment: false,
        }),
        category,
        account,
      });

    const result = await recurringTemplateService.update('rt-1', 'workspace-1', {
      workspace_id: 'workspace-1',
      total_occurrences: null,
    });

    expect(result.total_occurrences).toBeNull();
  });

  it('rejects clearing total_occurrences when merged template is installment', async () => {
    (mockDb.query.recurringTemplates.findFirst as any).mockResolvedValueOnce(
      createMockRecurringTemplate({
        total_occurrences: 6,
        end_date: null,
        is_installment: true,
      })
    );

    await expect(
      recurringTemplateService.update('rt-1', 'workspace-1', {
        workspace_id: 'workspace-1',
        total_occurrences: null,
        end_date: '2026-12-31',
      })
    ).rejects.toThrow('Installments require total occurrences');
  });
});
