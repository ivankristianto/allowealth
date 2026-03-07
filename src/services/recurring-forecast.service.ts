import { and, eq, inArray } from 'drizzle-orm';
import { type IDatabase, getActiveSchema } from '@/db';
import { getCacheManager, CacheKeys, CacheTags, hashFilters } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import { type PerfCollector, trackQuery } from '@/lib/perf';
import type {
  ForecastFilters,
  ForecastResult,
  ForecastRow,
  ForecastCurrencyTotals,
  RecurringTemplateOutput,
} from '@/lib/types/recurring';
import type { Currency } from '@/lib/enums';
import { calculateDueDate, shouldGenerateOccurrence } from '@/lib/utils/recurring-dates';

const log = createLogger('recurring-forecast');

const FREQUENCY_LABELS: Record<string, string> = {
  'weekly:1': 'Weekly',
  'weekly:2': 'Biweekly',
  'monthly:1': 'Monthly',
  'monthly:3': 'Quarterly',
  'monthly:6': 'Semi-annual',
  'monthly:12': 'Annual',
};

export function getFrequencyLabel(frequency: 'weekly' | 'monthly', intervalCount: number): string {
  const key = `${frequency}:${intervalCount}`;
  if (FREQUENCY_LABELS[key]) return FREQUENCY_LABELS[key];
  const unit = frequency === 'weekly' ? 'weeks' : 'months';
  return `Every ${intervalCount} ${unit}`;
}

export function computeForecast(
  templates: RecurringTemplateOutput[],
  startYear: number,
  startMonth: number,
  monthCount: number
): ForecastResult {
  // Build month keys
  const monthKeys: string[] = [];
  for (let i = 0; i < monthCount; i++) {
    const d = new Date(Date.UTC(startYear, startMonth - 1 + i, 1));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    monthKeys.push(`${y}-${m}`);
  }

  const windowStart = `${monthKeys[0]}-01`;
  const lastKey = monthKeys[monthKeys.length - 1];
  const [lastY, lastM] = lastKey.split('-').map(Number);
  const lastDay = new Date(Date.UTC(lastY, lastM, 0)).getUTCDate();
  const windowEnd = `${lastKey}-${String(lastDay).padStart(2, '0')}`;

  // Per-currency totals accumulator
  const currencyTotalsMap = new Map<
    Currency,
    Record<string, { income: number; expense: number }>
  >();

  const rows: ForecastRow[] = templates.map((tpl) => {
    const frequency = tpl.frequency ?? 'monthly';
    const intervalCount = tpl.interval_count ?? 1;
    const frequencyLabel = getFrequencyLabel(frequency, intervalCount);

    const months: Record<string, string | null> = {};
    for (const mk of monthKeys) {
      months[mk] = null;
    }

    // Calculate starting offset to skip pre-window occurrences
    const startDate = new Date(tpl.start_date + 'T00:00:00Z');
    const windowStartDate = new Date(Date.UTC(startYear, startMonth - 1, 1));
    let startOffset = 0;
    if (frequency === 'weekly') {
      const msGap = windowStartDate.getTime() - startDate.getTime();
      const weeksGap = Math.floor(msGap / (intervalCount * 7 * 86400000));
      startOffset = Math.max(0, weeksGap - 2);
    } else {
      const monthsGap =
        (startYear - startDate.getUTCFullYear()) * 12 + (startMonth - 1 - startDate.getUTCMonth());
      startOffset = Math.max(0, Math.floor(monthsGap / intervalCount) - 2);
    }
    const maxIterations =
      startOffset + (frequency === 'weekly' ? (monthCount + 1) * 6 : (monthCount + 1) * 2);

    for (let offset = startOffset; offset < maxIterations; offset++) {
      const dueDate = calculateDueDate(
        tpl.start_date,
        tpl.day_of_month,
        offset,
        frequency,
        intervalCount
      );

      if (dueDate > windowEnd) break;
      if (dueDate < windowStart) continue;

      const occurrenceNumber = tpl.starting_occurrence_number + offset;
      if (
        !shouldGenerateOccurrence(
          { total_occurrences: tpl.total_occurrences, end_date: tpl.end_date },
          occurrenceNumber,
          dueDate
        )
      ) {
        continue;
      }

      const mk = dueDate.slice(0, 7); // "YYYY-MM"
      if (months[mk] !== undefined) {
        const prev = months[mk] ? parseFloat(months[mk]!) : 0;
        months[mk] = (prev + parseFloat(tpl.amount)).toFixed(2);
      }
    }

    // Accumulate totals only for active templates
    if (tpl.status === 'active') {
      if (!currencyTotalsMap.has(tpl.currency)) {
        const init: Record<string, { income: number; expense: number }> = {};
        for (const mk of monthKeys) {
          init[mk] = { income: 0, expense: 0 };
        }
        currencyTotalsMap.set(tpl.currency, init);
      }
      const totals = currencyTotalsMap.get(tpl.currency)!;
      for (const mk of monthKeys) {
        if (months[mk]) {
          const amt = parseFloat(months[mk]!);
          if (tpl.type === 'income') {
            totals[mk].income += amt;
          } else {
            totals[mk].expense += amt;
          }
        }
      }
    }

    return {
      templateId: tpl.id,
      templateName: tpl.name,
      templateType: tpl.type,
      frequencyLabel,
      currency: tpl.currency,
      status: tpl.status,
      category: {
        id: tpl.category.id,
        name: tpl.category.name,
        icon: tpl.category.icon,
        color: tpl.category.color,
      },
      account: {
        id: tpl.account.id,
        name: tpl.account.name,
      },
      months,
    };
  });

  const totals: ForecastCurrencyTotals[] = Array.from(currencyTotalsMap.entries()).map(
    ([currency, monthMap]) => {
      const months: Record<string, { income: string; expense: string; net: string }> = {};
      for (const mk of monthKeys) {
        const { income, expense } = monthMap[mk];
        months[mk] = {
          income: income.toFixed(2),
          expense: expense.toFixed(2),
          net: (income - expense).toFixed(2),
        };
      }
      return { currency, months };
    }
  );

  return { rows, totals, monthKeys };
}

const FORECAST_TTL = 6 * 60 * 60; // 6 hours

export class RecurringForecastService {
  private schema = getActiveSchema();
  private db: IDatabase;

  constructor(db: IDatabase) {
    this.db = db;
  }

  async getForecast(
    workspaceId: string,
    filters: ForecastFilters = {},
    monthCount: number = 12,
    perf?: PerfCollector
  ): Promise<ForecastResult> {
    const filterKey = hashFilters({ ...filters, monthCount } as Record<string, unknown>);
    const cacheKey = CacheKeys.recurringForecast(workspaceId, filterKey);
    const cache = getCacheManager();

    try {
      const cached = await cache.get<ForecastResult>(cacheKey);
      if (cached) {
        perf?.cacheHit();
        return cached;
      }
      perf?.cacheMiss();
    } catch (error) {
      log.warn('cache read failed for recurring forecast:', error);
    }

    // Build query conditions
    const conditions = [eq(this.schema.recurringTemplates.workspace_id, workspaceId)];

    if (filters.status && filters.status !== 'all') {
      conditions.push(eq(this.schema.recurringTemplates.status, filters.status));
    } else if (!filters.status) {
      // Default: show active + paused
      conditions.push(inArray(this.schema.recurringTemplates.status, ['active', 'paused']));
    }

    if (filters.type) {
      conditions.push(eq(this.schema.recurringTemplates.type, filters.type));
    }

    if (filters.accountIds && filters.accountIds.length > 0) {
      conditions.push(inArray(this.schema.recurringTemplates.account_id, filters.accountIds));
    }

    const templates = await trackQuery('forecast.findTemplates', perf, async () => {
      return this.db.query.recurringTemplates.findMany({
        where: and(...conditions),
        with: {
          category: true,
          account: true,
        },
      });
    });

    // Map to RecurringTemplateOutput shape
    const mapped: RecurringTemplateOutput[] = templates.map((t: any) => ({
      ...t,
      category: {
        id: t.category.id,
        name: t.category.name,
        type: t.category.type,
        icon: t.category.icon,
        color: t.category.color,
      },
      account: {
        id: t.account.id,
        name: t.account.name,
        type: t.account.type,
      },
      nextDueDate: null,
      pendingCount: 0,
      confirmedCount: 0,
      skippedCount: 0,
    }));

    const now = new Date();
    const startYear = now.getUTCFullYear();
    const startMonth = now.getUTCMonth() + 1;

    const result = computeForecast(mapped, startYear, startMonth, monthCount);

    try {
      await cache.set(cacheKey, result, {
        ttl: FORECAST_TTL,
        tags: [CacheTags.workspace(workspaceId), CacheTags.RECURRING_FORECAST],
      });
    } catch (error) {
      log.warn('cache write failed for recurring forecast:', error);
    }

    return result;
  }
}
