import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { RecurringTemplateService } from '@/services/recurring-template.service';
import { resetCacheManager } from '@/lib/cache';
import {
  createMockAccount,
  createMockCategory,
  createMockDatabase,
  createMockRecurringTemplate,
  resetMockDatabase,
} from '@/services/test-helpers/mocks';

describe('Recurring template fan-out optimization', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let recurringTemplateService: RecurringTemplateService;

  const templateWithRelations = {
    ...createMockRecurringTemplate(),
    category: createMockCategory(),
    account: createMockAccount(),
  };

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    recurringTemplateService = new RecurringTemplateService(mockDb);
    resetMockDatabase(mockDb);
  });

  it('findAll does not hydrate unbounded occurrences per template', async () => {
    (mockDb.query.recurringTemplates.findMany as any).mockResolvedValueOnce([
      templateWithRelations,
    ]);

    let callIndex = 0;
    (mockDb.select as any).mockImplementation(() => {
      callIndex += 1;

      if (callIndex === 1) {
        return {
          from: mock(() => ({
            where: mock(() => Promise.resolve([{ count: 1 }])),
          })),
        };
      }

      return {
        from: mock(() => ({
          where: mock(() => ({
            groupBy: mock(() =>
              Promise.resolve([
                {
                  template_id: 'rt-1',
                  pending_count: 2,
                  confirmed_count: 1,
                  skipped_count: 0,
                  next_due_date: '2026-02-01',
                },
              ])
            ),
          })),
        })),
      };
    });

    const result = await recurringTemplateService.findAll('workspace-1', {
      page: 1,
      limit: 20,
      status: 'all',
    });

    expect(result.total).toBe(1);
    expect(result.templates).toHaveLength(1);
    expect(mockDb.query.recurringOccurrences.findMany).not.toHaveBeenCalled();
  });

  it('findById reads aggregated occurrence stats instead of loading all rows', async () => {
    (mockDb.query.recurringTemplates.findFirst as any).mockResolvedValueOnce(templateWithRelations);
    (mockDb.select as any).mockImplementation(() => ({
      from: mock(() => ({
        where: mock(() => ({
          groupBy: mock(() =>
            Promise.resolve([
              {
                template_id: 'rt-1',
                pending_count: 1,
                confirmed_count: 1,
                skipped_count: 0,
                next_due_date: '2026-02-01',
              },
            ])
          ),
        })),
      })),
    }));

    const template = await recurringTemplateService.findById('rt-1', 'workspace-1');

    expect(template).toBeDefined();
    expect(template?.pendingCount).toBe(1);
    expect(mockDb.query.recurringOccurrences.findMany).not.toHaveBeenCalled();
  });
});
