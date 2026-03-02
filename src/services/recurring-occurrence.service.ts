import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { type IDatabase, getActiveSchema, runTransaction } from '@/db';
import { logAuditEvent } from '@/lib/audit-log';
import { getCacheManager, CacheKeys, CacheTags, hashFilters, invalidateTags } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import { type PerfCollector, trackQuery } from '@/lib/perf';
import type { Currency } from '@/lib/enums';
import type {
  RecurringCalendarDay,
  RecurringOccurrenceOutput,
  RecurringStats,
  RecurringTemplate,
} from '@/lib/types/recurring';
import { confirmOccurrenceSchema, skipOccurrenceSchema } from '@/lib/validation/recurring';
import { generateInstallmentDescription } from '@/lib/utils/recurring-dates';
import type { RecurringMonthlySummary } from '@/lib/utils/recurring-summary';
import { RecurringServiceError, ServiceErrorCode } from './service-errors';
import { TransactionService } from './transaction.service';

const log = createLogger('recurring-occurrence');

interface PendingFilters {
  month?: string;
  status?: 'pending' | 'confirmed' | 'skipped' | 'all';
  due_within?: string;
}

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseMonthRange(monthKey?: string): { start: string; end: string } {
  const now = new Date();
  const fallbackYear = now.getUTCFullYear();
  const fallbackMonth = now.getUTCMonth() + 1;

  const [yearRaw, monthRaw] = (
    monthKey || `${fallbackYear}-${String(fallbackMonth).padStart(2, '0')}`
  )
    .split('-')
    .map(Number);

  const year = Number.isFinite(yearRaw) ? yearRaw : fallbackYear;
  const month = Number.isFinite(monthRaw) ? monthRaw : fallbackMonth;

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0));

  return {
    start: toIsoDate(startDate),
    end: toIsoDate(endDate),
  };
}

function parseDueWithinDays(value?: string): number | null {
  if (!value) return null;
  const matched = value.match(/^(\d+)d$/);
  if (!matched) return null;
  const parsed = Number.parseInt(matched[1] || '0', 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export class RecurringOccurrenceService {
  private schema = getActiveSchema();
  private db: IDatabase;
  private transactionService: TransactionService;

  constructor(db: IDatabase, transactionService?: TransactionService) {
    this.db = db;
    this.transactionService = transactionService ?? new TransactionService(db);
  }

  private ensureOccurrenceIsDue(dueDate: string): void {
    const todayIso = toIsoDate(new Date());
    if (dueDate > todayIso) {
      throw new RecurringServiceError(
        ServiceErrorCode.OCCURRENCE_NOT_DUE,
        'You can only confirm or skip an occurrence on or after its due date',
        409
      );
    }
  }

  private mapOccurrenceOutput(occurrence: any): RecurringOccurrenceOutput {
    return {
      id: occurrence.id,
      template_id: occurrence.template_id,
      workspace_id: occurrence.workspace_id,
      due_date: occurrence.due_date,
      occurrence_number: occurrence.occurrence_number,
      status: occurrence.status,
      transaction_id: occurrence.transaction_id,
      confirmed_amount: occurrence.confirmed_amount,
      skip_reason: occurrence.skip_reason,
      confirmed_at: occurrence.confirmed_at,
      created_at: occurrence.created_at,
      updated_at: occurrence.updated_at,
      templateName: occurrence.template.name,
      templateType: occurrence.template.type,
      templateAmount: occurrence.template.amount,
      currency: occurrence.template.currency,
      category: {
        id: occurrence.template.category.id,
        name: occurrence.template.category.name,
        icon: occurrence.template.category.icon,
        color: occurrence.template.category.color,
        type: occurrence.template.category.type,
      },
      account: {
        id: occurrence.template.account.id,
        name: occurrence.template.account.name,
        type: occurrence.template.account.type,
      },
      isInstallment: occurrence.template.is_installment,
      installmentLabel: occurrence.template.installment_label,
      totalOccurrences: occurrence.template.total_occurrences,
    };
  }

  private async invalidateWorkspaceCache(workspaceId: string): Promise<void> {
    await invalidateTags(
      [
        CacheTags.workspace(workspaceId),
        CacheTags.RECURRING,
        CacheTags.RECURRING_OCCURRENCES,
        CacheTags.RECURRING_CALENDAR,
        CacheTags.TRANSACTIONS,
        CacheTags.DASHBOARD,
      ],
      'strict'
    );
  }

  async findPending(
    workspaceId: string,
    filters: PendingFilters = {},
    perf?: PerfCollector
  ): Promise<{ occurrences: RecurringOccurrenceOutput[]; total: number }> {
    const normalizedFilters = {
      month: filters.month ?? null,
      status: filters.status ?? 'pending',
      due_within: filters.due_within ?? null,
    };

    const cache = getCacheManager();
    const cacheKey = CacheKeys.recurringOccurrences(workspaceId, hashFilters(normalizedFilters));

    try {
      const cached = await cache.get<{ occurrences: RecurringOccurrenceOutput[]; total: number }>(
        cacheKey
      );
      if (cached) {
        return cached;
      }
    } catch (error) {
      log.warn('cache read failed for recurring occurrences:', error);
    }

    const result = await trackQuery('RecurringOccurrenceService.findPending', perf, async () => {
      const monthRange = parseMonthRange(filters.month);
      const conditions = [eq(this.schema.recurringOccurrences.workspace_id, workspaceId)];

      if (filters.status && filters.status !== 'all') {
        conditions.push(eq(this.schema.recurringOccurrences.status, filters.status));
      } else if (!filters.status) {
        conditions.push(eq(this.schema.recurringOccurrences.status, 'pending'));
      }

      const dueWithinDays = parseDueWithinDays(filters.due_within);
      if (dueWithinDays !== null) {
        const today = new Date();
        const targetDate = new Date();
        targetDate.setUTCDate(targetDate.getUTCDate() + dueWithinDays);
        conditions.push(gte(this.schema.recurringOccurrences.due_date, toIsoDate(today)));
        conditions.push(lte(this.schema.recurringOccurrences.due_date, toIsoDate(targetDate)));
      } else {
        conditions.push(gte(this.schema.recurringOccurrences.due_date, monthRange.start));
        conditions.push(lte(this.schema.recurringOccurrences.due_date, monthRange.end));
      }

      const occurrences = await this.db.query.recurringOccurrences.findMany({
        where: and(...conditions),
        with: {
          template: {
            with: {
              category: true,
              account: true,
            },
          },
        },
        orderBy: [
          asc(this.schema.recurringOccurrences.due_date),
          asc(this.schema.recurringOccurrences.created_at),
        ],
      });

      // Pending occurrences from non-active templates are not actionable.
      const filtered = occurrences.filter(
        (occurrence) => occurrence.status !== 'pending' || occurrence.template.status === 'active'
      );

      const output = filtered.map((occurrence) => this.mapOccurrenceOutput(occurrence));
      return { occurrences: output, total: output.length };
    });

    try {
      await cache.set(cacheKey, result, {
        ttl: 900,
        tags: [CacheTags.workspace(workspaceId), CacheTags.RECURRING_OCCURRENCES],
      });
    } catch (error) {
      log.warn('cache write failed for recurring occurrences:', error);
    }

    return result;
  }

  async findByTemplate(
    templateId: string,
    workspaceId: string
  ): Promise<RecurringOccurrenceOutput[]> {
    const occurrences = await this.db.query.recurringOccurrences.findMany({
      where: and(
        eq(this.schema.recurringOccurrences.template_id, templateId),
        eq(this.schema.recurringOccurrences.workspace_id, workspaceId)
      ),
      with: {
        template: {
          with: {
            category: true,
            account: true,
          },
        },
      },
      orderBy: [desc(this.schema.recurringOccurrences.due_date)],
    });

    return occurrences.map((occurrence) => this.mapOccurrenceOutput(occurrence));
  }

  async confirm(
    id: string,
    workspaceId: string,
    input: {
      amount: string;
      transaction_date: Date;
      category_id: string;
      account_id: string;
      userId: string;
    }
  ) {
    const validated = confirmOccurrenceSchema.parse({
      amount: input.amount,
      transaction_date: input.transaction_date,
      category_id: input.category_id,
      account_id: input.account_id,
      workspace_id: workspaceId,
      user_id: input.userId,
    });

    const result = await runTransaction(this.db, async (tx) => {
      const occurrence = await tx.query.recurringOccurrences.findFirst({
        where: and(
          eq(this.schema.recurringOccurrences.id, id),
          eq(this.schema.recurringOccurrences.workspace_id, workspaceId)
        ),
        with: {
          template: {
            with: {
              category: true,
              account: true,
            },
          },
        },
      });

      if (!occurrence) {
        throw new RecurringServiceError(
          ServiceErrorCode.RECURRING_OCCURRENCE_NOT_FOUND,
          'Recurring occurrence not found',
          404
        );
      }

      if (occurrence.status === 'confirmed') {
        throw new RecurringServiceError(
          ServiceErrorCode.OCCURRENCE_ALREADY_CONFIRMED,
          'Recurring occurrence has already been confirmed',
          409
        );
      }

      if (occurrence.status === 'skipped') {
        throw new RecurringServiceError(
          ServiceErrorCode.OCCURRENCE_ALREADY_SKIPPED,
          'Recurring occurrence has already been skipped',
          409
        );
      }

      if (occurrence.template.status !== 'active') {
        throw new RecurringServiceError(
          ServiceErrorCode.TEMPLATE_NOT_ACTIVE,
          'Recurring template is not active',
          409
        );
      }

      this.ensureOccurrenceIsDue(occurrence.due_date);

      const template = occurrence.template as RecurringTemplate;
      const description =
        template.is_installment && template.total_occurrences
          ? generateInstallmentDescription(
              template.name,
              template.installment_label || 'Installment',
              occurrence.occurrence_number,
              template.total_occurrences
            )
          : template.description || template.name;

      let createdTransactionId: string | null = null;

      try {
        const transactionService =
          tx === this.db ? this.transactionService : new TransactionService(tx as IDatabase);
        const createdTransaction = await transactionService.create(
          {
            workspace_id: workspaceId,
            created_by_user_id: validated.user_id,
            type: template.type,
            amount: validated.amount,
            currency: template.currency,
            category_id: validated.category_id,
            account_id: validated.account_id,
            transaction_date: validated.transaction_date,
            description,
          },
          { skipDateValidation: true }
        );

        createdTransactionId = createdTransaction?.id ?? null;

        await tx
          .update(this.schema.recurringOccurrences)
          .set({
            status: 'confirmed',
            transaction_id: createdTransactionId,
            confirmed_amount: validated.amount,
            confirmed_at: new Date(),
            updated_at: new Date(),
          })
          .where(
            and(
              eq(this.schema.recurringOccurrences.id, id),
              eq(this.schema.recurringOccurrences.workspace_id, workspaceId),
              eq(this.schema.recurringOccurrences.status, 'pending')
            )
          );

        const confirmed = await tx.query.recurringOccurrences.findFirst({
          where: and(
            eq(this.schema.recurringOccurrences.id, id),
            eq(this.schema.recurringOccurrences.workspace_id, workspaceId),
            eq(this.schema.recurringOccurrences.status, 'confirmed')
          ),
        });

        if (!confirmed || confirmed.transaction_id !== createdTransactionId) {
          throw new RecurringServiceError(
            ServiceErrorCode.OCCURRENCE_ALREADY_CONFIRMED,
            'Occurrence could not be confirmed atomically',
            409
          );
        }

        void logAuditEvent({
          workspaceId,
          userId: validated.user_id,
          action: 'recurring_occurrence.confirm',
          entityType: 'recurring_occurrence',
          entityId: id,
          newValue: {
            transaction_id: createdTransactionId,
            confirmed_amount: validated.amount,
          },
        });

        return createdTransaction;
      } catch (error) {
        if (createdTransactionId) {
          try {
            await new TransactionService(tx as IDatabase).delete(
              createdTransactionId,
              workspaceId,
              validated.user_id
            );
          } catch (compensationError) {
            log.warn('failed to compensate orphaned transaction:', compensationError);
          }
        }

        throw error;
      }
    });

    await this.invalidateWorkspaceCache(workspaceId);
    return result;
  }

  async skip(
    id: string,
    workspaceId: string,
    reason?: string,
    performedByUserId?: string
  ): Promise<RecurringOccurrenceOutput> {
    const validated = skipOccurrenceSchema.parse({ skip_reason: reason });

    const occurrence = await this.db.query.recurringOccurrences.findFirst({
      where: and(
        eq(this.schema.recurringOccurrences.id, id),
        eq(this.schema.recurringOccurrences.workspace_id, workspaceId)
      ),
      with: {
        template: {
          with: {
            category: true,
            account: true,
          },
        },
      },
    });

    if (!occurrence) {
      throw new RecurringServiceError(
        ServiceErrorCode.RECURRING_OCCURRENCE_NOT_FOUND,
        'Recurring occurrence not found',
        404
      );
    }

    if (occurrence.status === 'confirmed') {
      throw new RecurringServiceError(
        ServiceErrorCode.OCCURRENCE_ALREADY_CONFIRMED,
        'Recurring occurrence has already been confirmed',
        409
      );
    }

    if (occurrence.status === 'skipped') {
      throw new RecurringServiceError(
        ServiceErrorCode.OCCURRENCE_ALREADY_SKIPPED,
        'Recurring occurrence has already been skipped',
        409
      );
    }

    this.ensureOccurrenceIsDue(occurrence.due_date);

    await this.db
      .update(this.schema.recurringOccurrences)
      .set({
        status: 'skipped',
        skip_reason: validated.skip_reason ?? null,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(this.schema.recurringOccurrences.id, id),
          eq(this.schema.recurringOccurrences.workspace_id, workspaceId),
          eq(this.schema.recurringOccurrences.status, 'pending')
        )
      );

    void logAuditEvent({
      workspaceId,
      userId: performedByUserId ?? occurrence.template.created_by_user_id,
      action: 'recurring_occurrence.skip',
      entityType: 'recurring_occurrence',
      entityId: id,
      newValue: {
        skip_reason: validated.skip_reason ?? null,
      },
    });

    await this.invalidateWorkspaceCache(workspaceId);

    const updated = await this.db.query.recurringOccurrences.findFirst({
      where: and(
        eq(this.schema.recurringOccurrences.id, id),
        eq(this.schema.recurringOccurrences.workspace_id, workspaceId)
      ),
      with: {
        template: {
          with: {
            category: true,
            account: true,
          },
        },
      },
    });

    if (!updated) {
      throw new RecurringServiceError(
        ServiceErrorCode.RECURRING_OCCURRENCE_NOT_FOUND,
        'Recurring occurrence not found',
        404
      );
    }

    return this.mapOccurrenceOutput(updated);
  }

  async getCalendarData(
    workspaceId: string,
    year: number,
    month: number
  ): Promise<RecurringCalendarDay[]> {
    const cache = getCacheManager();
    const cacheKey = CacheKeys.recurringCalendar(workspaceId, year, month);

    try {
      const cached = await cache.get<RecurringCalendarDay[]>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      log.warn('cache read failed for recurring calendar:', error);
    }

    const monthStart = toIsoDate(new Date(Date.UTC(year, month - 1, 1)));
    const monthEnd = toIsoDate(new Date(Date.UTC(year, month, 0)));

    const occurrences = await this.db.query.recurringOccurrences.findMany({
      where: and(
        eq(this.schema.recurringOccurrences.workspace_id, workspaceId),
        gte(this.schema.recurringOccurrences.due_date, monthStart),
        lte(this.schema.recurringOccurrences.due_date, monthEnd)
      ),
      with: {
        template: {
          with: {
            category: true,
            account: true,
          },
        },
      },
      orderBy: [asc(this.schema.recurringOccurrences.due_date)],
    });

    const dayMap = new Map<string, RecurringOccurrenceOutput[]>();
    for (const occurrence of occurrences) {
      const mapped = this.mapOccurrenceOutput(occurrence);
      const list = dayMap.get(mapped.due_date) || [];
      list.push(mapped);
      dayMap.set(mapped.due_date, list);
    }

    const result = Array.from(dayMap.entries())
      .map(([date, dayOccurrences]) => ({
        date,
        occurrences: dayOccurrences,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    try {
      await cache.set(cacheKey, result, {
        ttl: 900,
        tags: [CacheTags.workspace(workspaceId), CacheTags.RECURRING_CALENDAR],
      });
    } catch (error) {
      log.warn('cache write failed for recurring calendar:', error);
    }

    return result;
  }

  async getStats(workspaceId: string): Promise<RecurringStats> {
    const cache = getCacheManager();
    const cacheKey = CacheKeys.recurringStats(workspaceId);

    try {
      const cached = await cache.get<RecurringStats>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      log.warn('cache read failed for recurring stats:', error);
    }

    const now = new Date();
    const today = toIsoDate(now);
    const monthStart = toIsoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
    const monthEnd = toIsoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)));

    const pendingRows = await (this.db as any)
      .select({
        currency: this.schema.recurringTemplates.currency,
        amount: sql<string>`COALESCE(SUM(CAST(${this.schema.recurringTemplates.amount} AS NUMERIC)), 0)`,
        pending_count: sql<number>`COUNT(*)`,
        overdue_count: sql<number>`COALESCE(SUM(CASE WHEN ${this.schema.recurringOccurrences.due_date} < ${today} THEN 1 ELSE 0 END), 0)`,
      })
      .from(this.schema.recurringOccurrences)
      .innerJoin(
        this.schema.recurringTemplates,
        and(
          eq(this.schema.recurringTemplates.id, this.schema.recurringOccurrences.template_id),
          eq(
            this.schema.recurringTemplates.workspace_id,
            this.schema.recurringOccurrences.workspace_id
          )
        )
      )
      .where(
        and(
          eq(this.schema.recurringOccurrences.workspace_id, workspaceId),
          eq(this.schema.recurringOccurrences.status, 'pending'),
          eq(this.schema.recurringTemplates.status, 'active'),
          gte(this.schema.recurringOccurrences.due_date, monthStart),
          lte(this.schema.recurringOccurrences.due_date, monthEnd)
        )
      )
      .groupBy(this.schema.recurringTemplates.currency);

    const [confirmedRow] = await (this.db as any)
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(this.schema.recurringOccurrences)
      .where(
        and(
          eq(this.schema.recurringOccurrences.workspace_id, workspaceId),
          eq(this.schema.recurringOccurrences.status, 'confirmed'),
          gte(this.schema.recurringOccurrences.due_date, monthStart),
          lte(this.schema.recurringOccurrences.due_date, monthEnd)
        )
      );

    const pendingCount = pendingRows.reduce(
      (sum: number, row: any) => sum + Number(row.pending_count || 0),
      0
    );
    const overdueCount = pendingRows.reduce(
      (sum: number, row: any) => sum + Number(row.overdue_count || 0),
      0
    );

    const stats: RecurringStats = {
      pendingCount,
      pendingByCurrency: pendingRows.map((row: any) => ({
        currency: row.currency as Currency,
        amount: row.amount?.toString() || '0',
      })),
      overdueCount,
      confirmedThisMonth: Number(confirmedRow?.count || 0),
    };

    try {
      await cache.set(cacheKey, stats, {
        ttl: 900,
        tags: [CacheTags.workspace(workspaceId), CacheTags.RECURRING_OCCURRENCES],
      });
    } catch (error) {
      log.warn('cache write failed for recurring stats:', error);
    }

    return stats;
  }

  async getMonthlySummary(
    workspaceId: string,
    monthKey?: string
  ): Promise<RecurringMonthlySummary> {
    const monthRange = parseMonthRange(monthKey);

    const rows = await (this.db as any)
      .select({
        type: this.schema.recurringTemplates.type,
        currency: this.schema.recurringTemplates.currency,
        amount: sql<string>`COALESCE(SUM(CAST(${this.schema.recurringTemplates.amount} AS NUMERIC)), 0)`,
        item_count: sql<number>`COUNT(*)`,
      })
      .from(this.schema.recurringOccurrences)
      .innerJoin(
        this.schema.recurringTemplates,
        and(
          eq(this.schema.recurringTemplates.id, this.schema.recurringOccurrences.template_id),
          eq(
            this.schema.recurringTemplates.workspace_id,
            this.schema.recurringOccurrences.workspace_id
          )
        )
      )
      .where(
        and(
          eq(this.schema.recurringOccurrences.workspace_id, workspaceId),
          eq(this.schema.recurringOccurrences.status, 'pending'),
          eq(this.schema.recurringTemplates.status, 'active'),
          gte(this.schema.recurringOccurrences.due_date, monthRange.start),
          lte(this.schema.recurringOccurrences.due_date, monthRange.end)
        )
      )
      .groupBy(this.schema.recurringTemplates.type, this.schema.recurringTemplates.currency);

    const incomeByCurrency = new Map<string, number>();
    const expenseByCurrency = new Map<string, number>();
    let upcomingIncomeCount = 0;
    let upcomingExpenseCount = 0;

    for (const row of rows as Array<{
      type: 'income' | 'expense';
      currency: Currency;
      amount: string;
      item_count: number;
    }>) {
      const amount = Number.parseFloat(row.amount || '0');
      const count = Number(row.item_count || 0);
      if (row.type === 'income') {
        incomeByCurrency.set(row.currency, amount);
        upcomingIncomeCount += count;
      } else {
        expenseByCurrency.set(row.currency, amount);
        upcomingExpenseCount += count;
      }
    }

    const currencySet = new Set([...incomeByCurrency.keys(), ...expenseByCurrency.keys()]);
    const netByCurrency = Array.from(currencySet)
      .map((currency) => {
        const income = incomeByCurrency.get(currency) ?? 0;
        const expenses = expenseByCurrency.get(currency) ?? 0;
        return {
          currency: currency as Currency,
          income: income.toString(),
          expenses: expenses.toString(),
          net: (income - expenses).toString(),
        };
      })
      .sort((a, b) => a.currency.localeCompare(b.currency));

    return {
      upcomingIncomeCount,
      upcomingExpenseCount,
      incomeByCurrency: Array.from(incomeByCurrency.entries())
        .map(([currency, amount]) => ({
          currency: currency as Currency,
          amount: amount.toString(),
        }))
        .sort((a, b) => a.currency.localeCompare(b.currency)),
      expenseByCurrency: Array.from(expenseByCurrency.entries())
        .map(([currency, amount]) => ({
          currency: currency as Currency,
          amount: amount.toString(),
        }))
        .sort((a, b) => a.currency.localeCompare(b.currency)),
      netByCurrency,
    };
  }
}
