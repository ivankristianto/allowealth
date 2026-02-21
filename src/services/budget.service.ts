import { type IDatabase, getActiveSchema, runTransaction } from '@/db';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  decimalSubtract,
  decimalDivide,
  decimalMultiply,
  decimalCompare,
  decimalSum,
  decimalIsZero,
} from '@/lib/utils/decimal';
import { MONTH_NAMES } from '@/lib/utils/date';
import {
  createBudgetSchema,
  updateBudgetSchema,
  copyBudgetsSchema,
  initializeBudgetsSchema,
  type CreateBudgetInput,
  type UpdateBudgetInput,
  type CopyBudgetsInput,
  type InitializeBudgetsInput,
} from '@/lib/validation/budgets';
import type {
  Budget,
  BudgetWithCategory,
  CopyBudgetsResult,
  InitializeBudgetsResult,
} from '@/lib/types/budget';
import { BudgetServiceError, ServiceErrorCode } from './service-errors';
import { toHexColor } from '@/lib/utils/colorUtils';
import { getCacheManager, CacheKeys, CacheTags } from '@/lib/cache';
import { cacheOrFetch } from '@/lib/cache/cache-or-fetch';
import { type PerfCollector, trackQuery } from '@/lib/perf';
import { createCrudService } from './base/crud.factory';
import { WorkspaceMetaService } from './workspace-meta.service';
import type { Currency } from '@/lib/constants/currency';

export interface BudgetOverview {
  budget_id: string;
  category_id: string;
  category_name: string;
  category_type: 'expense' | 'income';
  category_icon: string;
  category_color: string;
  percentage: string;
  budget_amount: string;
  spent_amount: string;
  balance: string;
  status: 'ok' | 'warning' | 'exceeded';
  percentage_used: number;
}

export interface BudgetSummary {
  total_budget: string;
  total_spent: string;
  total_balance: string;
  categories_warning: number;
  categories_exceeded: number;
  categories: BudgetOverview[];
}

export interface MonthlyBudgetHistory {
  month: number;
  year: number;
  month_name: string;
  total_budget: string;
  total_spent: string;
  total_balance: string;
  categories_count: number;
  categories_exceeded: number;
  categories_warning: number;
  percentage_used: number;
}

export interface CategoryMonthData {
  month: number;
  year: number;
  month_name: string;
  spent_amount: string;
  budget_amount: string;
  percentage_used: number;
  status: 'ok' | 'warning' | 'exceeded';
}

export interface CategoryTrendRow {
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  avg_percentage_used: number;
  months: CategoryMonthData[];
}

export interface CategoryTrendData {
  months: { month: number; year: number; month_name: string }[];
  categories: CategoryTrendRow[];
}

export class BudgetService {
  /** Max rows per INSERT to stay within D1's 100 bound-parameter limit (9 × 10 cols = 90 params for copyBudgets which has 10 bound fields) */
  private static readonly BULK_INSERT_CHUNK_SIZE = 9;

  private get schema() {
    return getActiveSchema();
  }

  private crud: ReturnType<typeof createCrudService<any, any, any>>;
  private workspaceMetaService: WorkspaceMetaService;

  /**
   * Create a new BudgetService with database injection
   * @param db - Database instance (injected for testability)
   */
  constructor(private db: IDatabase) {
    this.crud = createCrudService<any, any, any>(db, {
      getTable: () => getActiveSchema().budgets,
      getQuery: () => db.query.budgets,
      getId: () => getActiveSchema().budgets.id,
      getWorkspaceId: () => getActiveSchema().budgets.workspace_id,
    });
    this.workspaceMetaService = new WorkspaceMetaService(db);
  }

  private async assertWorkspaceCurrencyAllowed(workspaceId: string, currency: Currency) {
    const { primary, secondary } =
      await this.workspaceMetaService.getWorkspaceCurrencies(workspaceId);
    const allowedCurrencies = [primary, ...(secondary ? [secondary] : [])];

    if (!allowedCurrencies.includes(currency)) {
      throw new BudgetServiceError(
        ServiceErrorCode.INVALID_META_VALUE,
        `Currency '${currency}' is not configured for this workspace. Allowed: ${allowedCurrencies.join(', ')}`,
        400
      );
    }
  }

  /**
   * Get budget overview for a specific month
   * Queries the budgets table (not categories) for budget amounts
   * Results are cached for 1 hour
   */
  async getMonthlyOverview(
    workspaceId: string,
    year: number,
    month: number,
    currency: Currency,
    perf?: PerfCollector
  ): Promise<BudgetSummary> {
    // Validate inputs first
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new Error('Invalid year parameter');
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error('Invalid month parameter');
    }

    const cacheKey = CacheKeys.budget(workspaceId, year, month, currency);

    return cacheOrFetch(
      cacheKey,
      {
        ttl: 3600,
        tags: [CacheTags.workspace(workspaceId), CacheTags.BUDGET, CacheTags.TRANSACTIONS],
      },
      () =>
        trackQuery('BudgetService.getMonthlyOverview', perf, () =>
          this.fetchMonthlyOverviewFromDb(workspaceId, year, month, currency)
        ),
      perf
    );
  }

  /**
   * Fetch budget overview from database (no caching)
   */
  private async fetchMonthlyOverviewFromDb(
    workspaceId: string,
    year: number,
    month: number,
    currency: Currency
  ): Promise<BudgetSummary> {
    // Get start and end of month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get all budgets for this month/year with category info
    const monthBudgets = await this.db.query.budgets.findMany({
      where: and(
        eq(this.schema.budgets.workspace_id, workspaceId),
        eq(this.schema.budgets.month, month),
        eq(this.schema.budgets.year, year),
        eq(this.schema.budgets.currency, currency)
      ),
      with: {
        category: true,
      },
    });

    // Filter to only expense categories that are active
    const expenseBudgets = monthBudgets.filter(
      (b) => b.category?.type === 'expense' && b.category?.is_active === true
    );

    // Get transactions for the month grouped by category
    const monthTransactions = await (this.db as any)
      .select({
        category_id: this.schema.transactions.category_id,
        total: sql<string>`sum(CAST(${this.schema.transactions.amount} AS NUMERIC))`,
      })
      .from(this.schema.transactions)
      .where(
        and(
          eq(this.schema.transactions.workspace_id, workspaceId),
          eq(this.schema.transactions.type, 'expense'),
          eq(this.schema.transactions.currency, currency),
          gte(this.schema.transactions.transaction_date, startDate),
          lte(this.schema.transactions.transaction_date, endDate),
          sql`${this.schema.transactions.deleted_at} IS NULL`
        )
      )
      .groupBy(this.schema.transactions.category_id);

    // Create a map of spent amounts by category
    const spentByCategory = new Map<string, string>();
    for (const tx of monthTransactions) {
      spentByCategory.set(tx.category_id, tx.total || '0');
    }

    // Calculate total budget for percentage calculation
    const totalBudgetAmount = expenseBudgets.reduce(
      (sum, b) => sum + parseFloat(b.budget_amount || '0'),
      0
    );

    // Build category overviews from budgets
    const categoryOverviews: BudgetOverview[] = expenseBudgets.map((budget) => {
      const budgetAmount = budget.budget_amount;
      const spentAmount = spentByCategory.get(budget.category_id) || '0';
      const balance = decimalSubtract(budgetAmount, spentAmount);
      const percentageUsed = !decimalIsZero(budgetAmount)
        ? parseFloat(decimalDivide(decimalMultiply(spentAmount, 100), budgetAmount))
        : 0;

      // Calculate percentage dynamically from budget amount
      // percentage = (budget_amount / total_budget_amount) * 100
      const budgetAmountNum = parseFloat(budgetAmount || '0');
      const calculatedPercentage =
        totalBudgetAmount > 0 ? (budgetAmountNum / totalBudgetAmount) * 100 : 0;

      let status: 'ok' | 'warning' | 'exceeded' = 'ok';
      if (percentageUsed > 100) {
        status = 'exceeded';
      } else if (percentageUsed >= 80) {
        status = 'warning';
      }

      return {
        budget_id: budget.id,
        category_id: budget.category_id,
        category_name: budget.category?.name ?? 'Unknown',
        category_type: (budget.category?.type ?? 'expense') as 'expense' | 'income',
        category_icon: budget.category?.icon ?? 'CircleDollarSign',
        category_color: toHexColor(budget.category?.color, '#6b7280'),
        percentage: calculatedPercentage.toFixed(2),
        budget_amount: budgetAmount,
        spent_amount: spentAmount,
        balance,
        status,
        percentage_used: Math.round(percentageUsed * 100) / 100,
      };
    });

    // Calculate totals using decimal arithmetic
    const budgetAmounts = categoryOverviews.map((cat) => cat.budget_amount);
    const spentAmounts = categoryOverviews.map((cat) => cat.spent_amount);

    const totalBudget = decimalSum(budgetAmounts);
    const totalSpent = decimalSum(spentAmounts);
    const totalBalance = decimalSubtract(totalBudget, totalSpent);

    const categoriesWarning = categoryOverviews.filter((c) => c.status === 'warning').length;
    const categoriesExceeded = categoryOverviews.filter((c) => c.status === 'exceeded').length;

    return {
      total_budget: totalBudget,
      total_spent: totalSpent,
      total_balance: totalBalance,
      categories_warning: categoriesWarning,
      categories_exceeded: categoriesExceeded,
      categories: categoryOverviews,
    };
  }

  /**
   * Get budget history for multiple months
   */
  async getBudgetHistory(
    workspaceId: string,
    currency: Currency,
    months: number = 12,
    perf?: PerfCollector
  ): Promise<MonthlyBudgetHistory[]> {
    // Validate months parameter
    if (!Number.isInteger(months) || months < 1 || months > 24) {
      throw new Error('Invalid months parameter (must be 1-24)');
    }

    const now = new Date();
    const history: MonthlyBudgetHistory[] = [];

    // Get data for each of the last N months
    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const overview = await this.getMonthlyOverview(workspaceId, year, month, currency, perf);

      const totalBudget = overview.total_budget;
      const totalSpent = overview.total_spent;
      const percentageUsed = !decimalIsZero(totalBudget)
        ? parseFloat(decimalDivide(decimalMultiply(totalSpent, 100), totalBudget))
        : 0;

      // Safely get month name with fallback
      const monthName = MONTH_NAMES[month - 1] ?? `Month ${month}`;

      history.push({
        month,
        year,
        month_name: monthName,
        total_budget: totalBudget,
        total_spent: totalSpent,
        total_balance: overview.total_balance,
        categories_count: overview.categories.length,
        categories_exceeded: overview.categories_exceeded,
        categories_warning: overview.categories_warning,
        percentage_used: Math.round(percentageUsed * 100) / 100,
      });
    }

    return history;
  }

  /**
   * Get category trends across multiple months
   * Pivots the data: rows = categories, columns = months
   * Sorted by worst average adherence (highest percentage_used first)
   */
  async getCategoryTrends(
    workspaceId: string,
    currency: 'IDR' | 'USD',
    months: number = 6,
    perf?: PerfCollector
  ): Promise<CategoryTrendData> {
    if (!Number.isInteger(months) || months < 1 || months > 24) {
      throw new Error('Invalid months parameter (must be 1-24)');
    }

    const now = new Date();
    const monthColumns: CategoryTrendData['months'] = [];
    const categoryMap = new Map<
      string,
      {
        category_id: string;
        category_name: string;
        category_icon: string;
        category_color: string;
        months: CategoryMonthData[];
        totalPercentage: number;
        monthCount: number;
      }
    >();

    // Collect per-category data for each month (oldest first)
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthName = MONTH_NAMES[month - 1] ?? `Month ${month}`;

      monthColumns.push({ month, year, month_name: monthName });

      const overview = await this.getMonthlyOverview(workspaceId, year, month, currency, perf);

      for (const cat of overview.categories) {
        let entry = categoryMap.get(cat.category_id);
        if (!entry) {
          entry = {
            category_id: cat.category_id,
            category_name: cat.category_name,
            category_icon: cat.category_icon,
            category_color: cat.category_color,
            months: [],
            totalPercentage: 0,
            monthCount: 0,
          };
          categoryMap.set(cat.category_id, entry);
        }

        entry.months.push({
          month,
          year,
          month_name: monthName,
          spent_amount: cat.spent_amount,
          budget_amount: cat.budget_amount,
          percentage_used: cat.percentage_used,
          status: cat.status,
        });
        entry.totalPercentage += cat.percentage_used;
        entry.monthCount += 1;
      }
    }

    // Fill missing months with zeroes for categories not present every month
    for (const entry of categoryMap.values()) {
      for (const col of monthColumns) {
        const hasMonth = entry.months.some((m) => m.month === col.month && m.year === col.year);
        if (!hasMonth) {
          entry.months.push({
            month: col.month,
            year: col.year,
            month_name: col.month_name,
            spent_amount: '0',
            budget_amount: '0',
            percentage_used: 0,
            status: 'ok',
          });
        }
      }
      // Sort months chronologically
      entry.months.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
    }

    // Build sorted category rows (worst adherence first)
    const categories: CategoryTrendRow[] = Array.from(categoryMap.values())
      .map((entry) => ({
        category_id: entry.category_id,
        category_name: entry.category_name,
        category_icon: entry.category_icon,
        category_color: entry.category_color,
        avg_percentage_used:
          entry.monthCount > 0
            ? Math.round((entry.totalPercentage / entry.monthCount) * 100) / 100
            : 0,
        months: entry.months,
      }))
      .sort((a, b) => b.avg_percentage_used - a.avg_percentage_used);

    return { months: monthColumns, categories };
  }

  /**
   * Get budget alerts for current month
   */
  async getAlerts(workspaceId: string, currency: Currency, perf?: PerfCollector) {
    const now = new Date();
    const overview = await this.getMonthlyOverview(
      workspaceId,
      now.getFullYear(),
      now.getMonth() + 1,
      currency,
      perf
    );

    const alerts = overview.categories
      .filter((cat) => cat.status === 'warning' || cat.status === 'exceeded')
      .map((cat) => ({
        category_id: cat.category_id,
        category_name: cat.category_name,
        status: cat.status,
        budget_amount: cat.budget_amount,
        spent_amount: cat.spent_amount,
        overage:
          cat.status === 'exceeded' && decimalCompare(cat.balance, '0') < 0
            ? decimalSubtract('0', cat.balance) // Get absolute value using decimal
            : '0',
      }));

    return alerts;
  }

  /**
   * Get budget remaining for a category in current month
   * Queries the budgets table for budget_amount
   * @param category_id - Category ID
   * @param workspaceId - Workspace ID
   * @param currency - Currency to use for budget lookup (required since categories no longer have currency)
   */
  async getCategoryRemaining(category_id: string, workspaceId: string, currency: Currency) {
    const category = await this.db.query.categories.findFirst({
      where: and(
        eq(this.schema.categories.id, category_id),
        eq(this.schema.categories.workspace_id, workspaceId)
      ),
    });

    if (!category) {
      throw new Error('Category not found');
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const startDate = new Date(currentYear, now.getMonth(), 1);
    const endDate = new Date(currentYear, now.getMonth() + 1, 0, 23, 59, 59);

    // Get budget for current month from budgets table
    const budget = await this.db.query.budgets.findFirst({
      where: and(
        eq(this.schema.budgets.category_id, category_id),
        eq(this.schema.budgets.workspace_id, workspaceId),
        eq(this.schema.budgets.month, currentMonth),
        eq(this.schema.budgets.year, currentYear),
        eq(this.schema.budgets.currency, currency)
      ),
    });

    // If no budget set for this month, return zero budget
    const budgetAmount = budget?.budget_amount ?? '0';

    const [result] = await (this.db as any)
      .select({
        total: sql<string>`COALESCE(sum(CAST(${this.schema.transactions.amount} AS NUMERIC)), 0)`,
      })
      .from(this.schema.transactions)
      .where(
        and(
          eq(this.schema.transactions.workspace_id, workspaceId),
          eq(this.schema.transactions.category_id, category_id),
          eq(this.schema.transactions.type, 'expense'),
          eq(this.schema.transactions.currency, currency),
          gte(this.schema.transactions.transaction_date, startDate),
          lte(this.schema.transactions.transaction_date, endDate),
          sql`${this.schema.transactions.deleted_at} IS NULL`
        )
      );

    const spentAmount = result?.total || '0';
    const remaining = decimalSubtract(budgetAmount, spentAmount);
    const percentageUsed = !decimalIsZero(budgetAmount)
      ? decimalDivide(decimalMultiply(spentAmount, 100), budgetAmount)
      : '0';

    return {
      category_id: category.id,
      category_name: category.name,
      budget_amount: budgetAmount,
      spent_amount: spentAmount,
      remaining,
      percentage_used: percentageUsed,
    };
  }

  /**
   * Export budget overview to CSV format
   */
  async exportToCSV(
    workspaceId: string,
    year: number,
    month: number,
    currency: Currency
  ): Promise<string> {
    // Query budgets directly to guarantee the id field is present
    const monthBudgets = await this.db.query.budgets.findMany({
      where: and(
        eq(this.schema.budgets.workspace_id, workspaceId),
        eq(this.schema.budgets.month, month),
        eq(this.schema.budgets.year, year),
        eq(this.schema.budgets.currency, currency)
      ),
      with: {
        category: true,
      },
    });

    // Filter to active expense categories only
    const activeBudgets = monthBudgets.filter(
      (b) => b.category?.type === 'expense' && b.category?.is_active === true
    );

    // CSV header — template format for re-import
    const headers = ['budget_id', 'budget_name', 'budget_amount'];

    // Build CSV rows directly from budget records
    const csvRows = activeBudgets.map((b) => [
      b.id,
      b.category?.name ?? 'Unknown',
      b.budget_amount,
    ]);

    // Combine header and rows
    const allRows = [headers, ...csvRows];

    // Convert to CSV string
    return allRows
      .map((row) =>
        row
          .map((cell) => {
            // Escape quotes and wrap in quotes if contains comma
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          })
          .join(',')
      )
      .join('\n');
  }

  /**
   * Import budget amounts from parsed CSV rows.
   * Validates that each budget_id belongs to the target month/year/currency,
   * then updates the budget amount. Rejects IDs not found in current month.
   */
  async importFromCSV(
    workspaceId: string,
    rows: Array<{ budget_id: string; budget_amount: string }>,
    targetMonth: number,
    targetYear: number,
    currency: Currency
  ): Promise<{
    updated: number;
    errors: Array<{ row: number; message: string }>;
  }> {
    // Validate inputs
    if (!Number.isInteger(targetYear) || targetYear < 2000 || targetYear > 2100) {
      throw new Error('Invalid year parameter');
    }
    if (!Number.isInteger(targetMonth) || targetMonth < 1 || targetMonth > 12) {
      throw new Error('Invalid month parameter');
    }

    // Get existing budgets for the target month to build valid ID set
    const existingBudgets = await this.db.query.budgets.findMany({
      where: and(
        eq(this.schema.budgets.workspace_id, workspaceId),
        eq(this.schema.budgets.month, targetMonth),
        eq(this.schema.budgets.year, targetYear),
        eq(this.schema.budgets.currency, currency)
      ),
    });

    const validBudgetIds = new Set(existingBudgets.map((b: { id: string }) => b.id));
    const closedBudgetIds = new Set(
      existingBudgets
        .filter((b: { id: string; is_closed: boolean }) => b.is_closed)
        .map((b: { id: string }) => b.id)
    );

    // Validate rows and prepare updates
    const errors: Array<{ row: number; message: string }> = [];
    const validUpdates: Array<{ id: string; budget_amount: string }> = [];
    const seenIds = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const budgetId = row.budget_id?.trim();
      const budgetAmount = (row.budget_amount ?? '').trim();

      if (!budgetId) {
        errors.push({ row: i + 1, message: 'Missing budget ID' });
        continue;
      }

      if (!budgetAmount) {
        errors.push({ row: i + 1, message: 'Missing budget amount' });
        continue;
      }

      if (!validBudgetIds.has(budgetId)) {
        errors.push({
          row: i + 1,
          message: `Budget ID "${budgetId}" not found in ${targetYear}-${String(targetMonth).padStart(2, '0')}`,
        });
        continue;
      }

      if (closedBudgetIds.has(budgetId)) {
        errors.push({
          row: i + 1,
          message: `Budget ID "${budgetId}" is closed and cannot be updated`,
        });
        continue;
      }

      if (seenIds.has(budgetId)) {
        errors.push({ row: i + 1, message: `Duplicate budget ID "${budgetId}" in CSV` });
        continue;
      }
      seenIds.add(budgetId);

      if (!/^\d+(\.\d+)?$/.test(budgetAmount)) {
        errors.push({
          row: i + 1,
          message: `Invalid amount "${budgetAmount}" — must be a plain number (e.g. 100000 or 100000.50)`,
        });
        continue;
      }
      const parsedAmount = Number(budgetAmount);
      if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
        errors.push({ row: i + 1, message: `Invalid amount "${budgetAmount}"` });
        continue;
      }

      validUpdates.push({
        id: budgetId,
        budget_amount: parsedAmount.toString(),
      });
    }

    // Execute updates in a transaction (PostgreSQL) or sequentially (SQLite)
    let updated = 0;
    if (validUpdates.length > 0) {
      await runTransaction(this.db, async (tx) => {
        for (const update of validUpdates) {
          await tx
            .update(this.schema.budgets)
            .set({ budget_amount: update.budget_amount })
            .where(
              and(
                eq(this.schema.budgets.id, update.id),
                eq(this.schema.budgets.workspace_id, workspaceId)
              )
            );
        }
        updated = validUpdates.length;
      });
    }

    // Invalidate budget cache
    const cache = getCacheManager();
    await cache.invalidateByTags([CacheTags.workspace(workspaceId), CacheTags.BUDGET]);

    return { updated, errors };
  }

  // ============================================
  // CRUD Methods for Budgets Table
  // ============================================

  /**
   * Create a new budget record
   * Note: Currency is now specified directly on the budget, no longer validated against category
   */
  async createBudget(input: CreateBudgetInput): Promise<Budget> {
    const validated = createBudgetSchema.parse(input);
    await this.assertWorkspaceCurrencyAllowed(validated.workspace_id, validated.currency);

    // Check if category exists and belongs to workspace
    const category = await this.db.query.categories.findFirst({
      where: and(
        eq(this.schema.categories.id, validated.category_id),
        eq(this.schema.categories.workspace_id, validated.workspace_id),
        eq(this.schema.categories.is_active, true)
      ),
    });

    if (!category) {
      throw new BudgetServiceError(
        ServiceErrorCode.CATEGORY_NOT_FOUND,
        'Category not found or inactive',
        404
      );
    }

    // Check if budget already exists for this category/month/year/currency combination
    const existingBudget = await this.db.query.budgets.findFirst({
      where: and(
        eq(this.schema.budgets.workspace_id, validated.workspace_id),
        eq(this.schema.budgets.category_id, validated.category_id),
        eq(this.schema.budgets.month, validated.month),
        eq(this.schema.budgets.year, validated.year),
        eq(this.schema.budgets.currency, validated.currency)
      ),
    });

    if (existingBudget) {
      throw new BudgetServiceError(
        ServiceErrorCode.BUDGET_ALREADY_EXISTS,
        `Budget already exists for this category in ${validated.month}/${validated.year} with currency ${validated.currency}`,
        409
      );
    }

    const id = nanoid();
    const [budget] = await this.db
      .insert(this.schema.budgets)
      .values({
        id,
        workspace_id: validated.workspace_id,
        created_by_user_id: validated.created_by_user_id,
        category_id: validated.category_id,
        month: validated.month,
        year: validated.year,
        budget_amount: validated.budget_amount,
        currency: validated.currency,
        notes: validated.notes,
      })
      .returning();

    // Invalidate budget cache
    const cache = getCacheManager();
    await cache.invalidateByTags([CacheTags.workspace(validated.workspace_id), CacheTags.BUDGET]);

    return budget as Budget;
  }

  /**
   * Update an existing budget record
   */
  async updateBudget(id: string, workspaceId: string, input: UpdateBudgetInput): Promise<Budget> {
    const validated = updateBudgetSchema.parse(input);

    // Check if budget exists and belongs to workspace
    const existingBudget = await this.getBudgetById(id, workspaceId);
    if (!existingBudget) {
      throw new BudgetServiceError(ServiceErrorCode.BUDGET_NOT_FOUND, 'Budget not found', 404);
    }

    // Check if budget is closed
    if (existingBudget.is_closed) {
      throw new BudgetServiceError(
        ServiceErrorCode.BUDGET_CLOSED,
        'Cannot modify a closed budget',
        400
      );
    }

    // Check that at least one field is being updated
    if (
      validated.budget_amount === undefined &&
      validated.notes === undefined &&
      validated.is_closed === undefined
    ) {
      throw new BudgetServiceError(
        ServiceErrorCode.VALIDATION_ERROR,
        'At least one field must be provided for update',
        400
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (validated.budget_amount !== undefined) {
      updateData.budget_amount = validated.budget_amount;
    }
    if (validated.notes !== undefined) {
      updateData.notes = validated.notes;
    }
    if (validated.is_closed !== undefined) {
      updateData.is_closed = validated.is_closed;
    }

    await this.db
      .update(this.schema.budgets)
      .set(updateData)
      .where(
        and(eq(this.schema.budgets.id, id), eq(this.schema.budgets.workspace_id, workspaceId))
      );

    // Invalidate budget cache
    const cache = getCacheManager();
    await cache.invalidateByTags([CacheTags.workspace(workspaceId), CacheTags.BUDGET]);

    const updatedBudget = await this.getBudgetById(id, workspaceId);
    return updatedBudget as Budget;
  }

  /**
   * Delete a budget record
   * P2: TODO - Consider returning the deleted budget for UI confirmation/undo
   */
  async deleteBudget(id: string, workspaceId: string): Promise<{ success: boolean }> {
    const existingBudget = await this.getBudgetById(id, workspaceId);
    if (!existingBudget) {
      throw new BudgetServiceError(ServiceErrorCode.BUDGET_NOT_FOUND, 'Budget not found', 404);
    }

    // Check if budget is closed
    if (existingBudget.is_closed) {
      throw new BudgetServiceError(
        ServiceErrorCode.BUDGET_CLOSED,
        'Cannot delete a closed budget',
        400
      );
    }

    await this.db
      .delete(this.schema.budgets)
      .where(
        and(eq(this.schema.budgets.id, id), eq(this.schema.budgets.workspace_id, workspaceId))
      );

    // Invalidate budget cache
    const cache = getCacheManager();
    await cache.invalidateByTags([CacheTags.workspace(workspaceId), CacheTags.BUDGET]);

    return { success: true };
  }

  /**
   * Get a single budget by ID
   */
  async getBudgetById(id: string, workspaceId: string): Promise<Budget | null> {
    return this.crud.findById(id, workspaceId);
  }

  /**
   * Get a budget by category, month, and year
   */
  async getBudgetByCategory(
    category_id: string,
    workspaceId: string,
    month: number,
    year: number
  ): Promise<Budget | null> {
    const budget = await this.db.query.budgets.findFirst({
      where: and(
        eq(this.schema.budgets.category_id, category_id),
        eq(this.schema.budgets.workspace_id, workspaceId),
        eq(this.schema.budgets.month, month),
        eq(this.schema.budgets.year, year)
      ),
    });

    return budget as Budget | null;
  }

  /**
   * Find all budgets for a workspace with optional filters
   */
  async findAllBudgets(
    workspaceId: string,
    month: number,
    year: number,
    currency?: Currency
  ): Promise<BudgetWithCategory[]> {
    const conditions = [
      eq(this.schema.budgets.workspace_id, workspaceId),
      eq(this.schema.budgets.month, month),
      eq(this.schema.budgets.year, year),
    ];

    if (currency) {
      conditions.push(eq(this.schema.budgets.currency, currency));
    }

    const result = await this.db.query.budgets.findMany({
      where: and(...conditions),
      with: {
        category: true,
      },
    });

    return result as BudgetWithCategory[];
  }

  /**
   * Check if any budgets exist for a given month/year
   * Used to determine if month navigation should be enabled for future months
   */
  async hasBudgetsForMonth(
    workspaceId: string,
    year: number,
    month: number,
    currency?: Currency
  ): Promise<boolean> {
    // Validate inputs (consistent with other service methods)
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new Error('Invalid year parameter');
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error('Invalid month parameter');
    }

    const conditions = [
      eq(this.schema.budgets.workspace_id, workspaceId),
      eq(this.schema.budgets.month, month),
      eq(this.schema.budgets.year, year),
    ];

    if (currency) {
      conditions.push(eq(this.schema.budgets.currency, currency));
    }

    const result = await this.db.query.budgets.findFirst({
      where: and(...conditions),
      columns: { id: true },
    });

    return result !== undefined;
  }

  /**
   * Initialize budgets for all uninitialized expense categories
   * Creates budget entries with amount='0' for categories without budgets in the target month
   */
  async initializeAllBudgets(input: InitializeBudgetsInput): Promise<InitializeBudgetsResult> {
    const validated = initializeBudgetsSchema.parse(input);
    await this.assertWorkspaceCurrencyAllowed(validated.workspace_id, validated.currency);

    const result = await runTransaction(this.db, async (tx) => {
      // Get all active expense categories for the workspace
      const allCategoriesRaw = await tx.query.categories.findMany({
        where: and(
          eq(this.schema.categories.workspace_id, validated.workspace_id),
          eq(this.schema.categories.is_active, true),
          eq(this.schema.categories.type, 'expense')
        ),
      });

      // Defensive filter: ensure only active expense categories (query may not filter in all contexts)
      const allCategories = allCategoriesRaw.filter(
        (cat: { type: string; is_active: boolean }) =>
          cat.type === 'expense' && cat.is_active === true
      );

      if (allCategories.length === 0) {
        return { initialized_count: 0, categories: [] };
      }

      // Get existing budgets for this month/year/currency
      const existingBudgets = await tx.query.budgets.findMany({
        where: and(
          eq(this.schema.budgets.workspace_id, validated.workspace_id),
          eq(this.schema.budgets.month, validated.month),
          eq(this.schema.budgets.year, validated.year),
          eq(this.schema.budgets.currency, validated.currency)
        ),
      });

      // Filter to categories without budgets (Set for O(1) lookup)
      const existingCategoryIds = new Set(
        existingBudgets.map((b: { category_id: string }) => b.category_id)
      );
      const uninitializedCategories = allCategories.filter(
        (cat: { id: string }) => !existingCategoryIds.has(cat.id)
      );

      if (uninitializedCategories.length === 0) {
        return { initialized_count: 0, categories: [] };
      }

      // Bulk insert budget records with amount='0'
      const newBudgets = uninitializedCategories.map((cat: { id: string }) => ({
        id: nanoid(),
        workspace_id: validated.workspace_id,
        created_by_user_id: validated.created_by_user_id,
        category_id: cat.id,
        month: validated.month,
        year: validated.year,
        budget_amount: '0',
        currency: validated.currency,
        is_closed: false,
      }));

      // Conflict-safe write for idempotency under concurrent requests.
      // Chunked to stay within D1's 100 bound-parameter limit.
      for (
        let offset = 0;
        offset < newBudgets.length;
        offset += BudgetService.BULK_INSERT_CHUNK_SIZE
      ) {
        const chunk = newBudgets.slice(offset, offset + BudgetService.BULK_INSERT_CHUNK_SIZE);
        await tx.insert(this.schema.budgets).values(chunk).onConflictDoNothing();
      }

      // Re-query to return actual initialized categories after conflict resolution.
      const candidateCategoryIds = uninitializedCategories.map((cat: { id: string }) => cat.id);
      const persistedBudgets = await tx.query.budgets.findMany({
        where: and(
          eq(this.schema.budgets.workspace_id, validated.workspace_id),
          eq(this.schema.budgets.month, validated.month),
          eq(this.schema.budgets.year, validated.year),
          eq(this.schema.budgets.currency, validated.currency),
          inArray(this.schema.budgets.category_id, candidateCategoryIds)
        ),
        columns: { category_id: true },
      });

      const persistedCategoryIds = new Set(
        persistedBudgets.map((b: { category_id: string }) => b.category_id)
      );
      const initializedCategories = uninitializedCategories.filter((cat: { id: string }) =>
        persistedCategoryIds.has(cat.id)
      );

      return {
        initialized_count: initializedCategories.length,
        categories: initializedCategories.map((cat: { id: string; name: string }) => ({
          id: cat.id,
          name: cat.name,
        })),
      };
    });

    if (result.initialized_count > 0) {
      const cache = getCacheManager();
      await cache.invalidateByTags([CacheTags.workspace(validated.workspace_id), CacheTags.BUDGET]);
    }

    return result;
  }

  /**
   * Copy all budgets from source month to target month
   *
   * Duplicate detection uses both category_id AND currency as composite key
   * to properly handle multi-currency budgets.
   */
  async copyBudgetsToMonth(input: CopyBudgetsInput): Promise<CopyBudgetsResult> {
    const validated = copyBudgetsSchema.parse(input);

    // Get all budgets from source month
    const sourceBudgets = await this.db.query.budgets.findMany({
      where: and(
        eq(this.schema.budgets.workspace_id, validated.workspace_id),
        eq(this.schema.budgets.month, validated.source_month),
        eq(this.schema.budgets.year, validated.source_year)
      ),
    });

    if (sourceBudgets.length === 0) {
      throw new BudgetServiceError(
        ServiceErrorCode.NO_BUDGETS_TO_COPY,
        'No budgets found in source month to copy',
        404
      );
    }

    // Get existing budgets in target month to avoid duplicates
    const existingTargetBudgets = await this.db.query.budgets.findMany({
      where: and(
        eq(this.schema.budgets.workspace_id, validated.workspace_id),
        eq(this.schema.budgets.month, validated.target_month),
        eq(this.schema.budgets.year, validated.target_year)
      ),
    });

    // Create composite key (category_id + currency) for duplicate detection
    // This ensures budgets for the same category but different currencies are handled separately
    const createBudgetKey = (categoryId: string, currency: string) => `${categoryId}:${currency}`;

    const existingBudgetKeys = new Set(
      existingTargetBudgets.map((b: Budget) => createBudgetKey(b.category_id, b.currency))
    );

    // Filter out budgets that already exist in target month (same category AND currency)
    const budgetsToCopy = sourceBudgets.filter(
      (b: Budget) => !existingBudgetKeys.has(createBudgetKey(b.category_id, b.currency))
    );

    const skippedCount = sourceBudgets.length - budgetsToCopy.length;

    // Copy budgets to target month using chunked bulk insert inside a transaction for atomicity
    if (budgetsToCopy.length > 0) {
      const newBudgets = budgetsToCopy.map((b: Budget) => ({
        id: nanoid(),
        workspace_id: validated.workspace_id,
        created_by_user_id: validated.created_by_user_id,
        category_id: b.category_id,
        month: validated.target_month,
        year: validated.target_year,
        budget_amount: b.budget_amount,
        currency: b.currency,
        notes: b.notes,
        is_closed: false,
      }));

      // Chunked insert to stay within D1's 100 bound-parameter limit.
      await runTransaction(this.db, async (tx) => {
        for (
          let offset = 0;
          offset < newBudgets.length;
          offset += BudgetService.BULK_INSERT_CHUNK_SIZE
        ) {
          const chunk = newBudgets.slice(offset, offset + BudgetService.BULK_INSERT_CHUNK_SIZE);
          await tx.insert(this.schema.budgets).values(chunk);
        }
      });
    }

    // Invalidate budget cache for the workspace
    const cache = getCacheManager();
    await cache.invalidateByTags([CacheTags.workspace(validated.workspace_id), CacheTags.BUDGET]);

    return {
      copied_count: budgetsToCopy.length,
      skipped_count: skippedCount,
      target_month: validated.target_month,
      target_year: validated.target_year,
    };
  }
}
