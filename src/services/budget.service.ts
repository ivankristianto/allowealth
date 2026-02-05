import { type IDatabase, getActiveSchema } from '@/db';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  decimalSubtract,
  decimalDivide,
  decimalMultiply,
  decimalCompare,
  decimalSum,
  decimalIsZero,
} from '@/lib/utils/decimal';
import {
  createBudgetSchema,
  updateBudgetSchema,
  copyBudgetsSchema,
  type CreateBudgetInput,
  type UpdateBudgetInput,
  type CopyBudgetsInput,
} from '@/lib/validation/budgets';
import type { Budget, BudgetWithCategory, CopyBudgetsResult } from '@/lib/types/budget';
import { BudgetServiceError, ServiceErrorCode } from './service-errors';
import { toHexColor } from '@/lib/utils/colorUtils';
import { getCacheManager, CacheKeys, CacheTags } from '@/lib/cache';
import { type PerfCollector, trackQuery } from '@/lib/perf';

export interface BudgetOverview {
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

export class BudgetService {
  private schema = getActiveSchema();

  /**
   * Create a new BudgetService with database injection
   * @param db - Database instance (injected for testability)
   */
  constructor(private db: IDatabase) {}

  /**
   * Get budget overview for a specific month
   * Queries the budgets table (not categories) for budget amounts
   * Results are cached for 1 hour
   */
  async getMonthlyOverview(
    workspaceId: string,
    year: number,
    month: number,
    currency: 'IDR' | 'USD',
    perf?: PerfCollector
  ): Promise<BudgetSummary> {
    // Validate inputs first
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new Error('Invalid year parameter');
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error('Invalid month parameter');
    }

    // Try cache first
    const cache = getCacheManager();
    const cacheKey = CacheKeys.budget(workspaceId, year, month, currency);

    // Cache read - fail-silent, treat errors as cache miss
    let cached: BudgetSummary | null = null;
    try {
      cached = await cache.get<BudgetSummary>(cacheKey);
    } catch {
      // Cache read failed, continue to DB fetch
    }
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from DB
    const result = await trackQuery('BudgetService.getMonthlyOverview', perf, () =>
      this.fetchMonthlyOverviewFromDb(workspaceId, year, month, currency)
    );

    // Cache write - fail-silent, log at debug level but don't rethrow
    try {
      await cache.set(cacheKey, result, {
        ttl: 3600,
        tags: [CacheTags.workspace(workspaceId), CacheTags.BUDGET, CacheTags.TRANSACTIONS],
      });
    } catch {
      // Cache write failed, continue without caching
    }

    return result;
  }

  /**
   * Fetch budget overview from database (no caching)
   */
  private async fetchMonthlyOverviewFromDb(
    workspaceId: string,
    year: number,
    month: number,
    currency: 'IDR' | 'USD'
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
        total: sql<string>`sum(CAST(${this.schema.transactions.amount} AS REAL))`,
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
      if (percentageUsed >= 100) {
        status = 'exceeded';
      } else if (percentageUsed >= 80) {
        status = 'warning';
      }

      return {
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
    currency: 'IDR' | 'USD',
    months: number = 12,
    perf?: PerfCollector
  ): Promise<MonthlyBudgetHistory[]> {
    // Validate months parameter
    if (!Number.isInteger(months) || months < 1 || months > 24) {
      throw new Error('Invalid months parameter (must be 1-24)');
    }

    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

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
      const monthName = monthNames[month - 1] ?? `Month ${month}`;

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
   * Get budget alerts for current month
   */
  async getAlerts(workspaceId: string, currency: 'IDR' | 'USD', perf?: PerfCollector) {
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
  async getCategoryRemaining(category_id: string, workspaceId: string, currency: 'IDR' | 'USD') {
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
        total: sql<string>`COALESCE(sum(CAST(${this.schema.transactions.amount} AS REAL)), 0)`,
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
    currency: 'IDR' | 'USD',
    sortBy?: 'category' | 'percentage' | 'budget' | 'spent' | 'balance' | 'status',
    sortOrder?: 'asc' | 'desc'
  ): Promise<string> {
    const overview = await this.getMonthlyOverview(workspaceId, year, month, currency);

    // Sort categories based on sortBy and sortOrder (same logic as BudgetOverviewTable)
    let sortedCategories = [...overview.categories];
    if (sortBy && sortOrder) {
      sortedCategories = sortedCategories.sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case 'category':
            comparison = a.category_name.localeCompare(b.category_name);
            break;
          case 'percentage':
            comparison = a.percentage_used - b.percentage_used;
            break;
          case 'budget':
            comparison = parseFloat(a.budget_amount) - parseFloat(b.budget_amount);
            break;
          case 'spent':
            comparison = parseFloat(a.spent_amount) - parseFloat(b.spent_amount);
            break;
          case 'balance':
            comparison = parseFloat(a.balance) - parseFloat(b.balance);
            break;
          case 'status':
            const statusOrder = { exceeded: 0, warning: 1, ok: 2 };
            comparison = statusOrder[a.status] - statusOrder[b.status];
            break;
          default:
            comparison = 0;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    // CSV header
    const headers = [
      'category',
      'percentage',
      'budget_amount',
      'spent_amount',
      'balance',
      'status',
      'percentage_used',
    ];

    // Build CSV rows from sorted categories
    const csvRows = sortedCategories.map((cat) => [
      cat.category_name,
      cat.percentage,
      cat.budget_amount,
      cat.spent_amount,
      cat.balance,
      cat.status,
      cat.percentage_used.toString(),
    ]);

    // Add totals row
    csvRows.push([
      'TOTAL',
      '100',
      overview.total_budget,
      overview.total_spent,
      overview.total_balance,
      '',
      '',
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
   * Import budgets from parsed CSV rows.
   * Matches category names to existing categories. Optionally overwrites existing budgets.
   */
  async importFromCSV(
    workspaceId: string,
    createdByUserId: string,
    rows: Array<{ category: string; budget_amount: string }>,
    overwrite: boolean,
    targetMonth: number,
    targetYear: number,
    currency: 'IDR' | 'USD'
  ): Promise<{
    imported: number;
    skipped: number;
    errors: Array<{ row: number; message: string }>;
  }> {
    // Get all categories for name → ID mapping
    const allCategories = await this.db.query.categories.findMany({
      where: and(
        eq(this.schema.categories.workspace_id, workspaceId),
        eq(this.schema.categories.is_active, true)
      ),
    });

    const categoryMap = new Map(
      allCategories.map((c: { id: string; name: string }) => [c.name.toLowerCase(), c.id])
    );

    // If overwrite, delete existing budgets for this month/year/currency
    if (overwrite) {
      await this.db
        .delete(this.schema.budgets)
        .where(
          and(
            eq(this.schema.budgets.workspace_id, workspaceId),
            eq(this.schema.budgets.month, targetMonth),
            eq(this.schema.budgets.year, targetYear),
            eq(this.schema.budgets.currency, currency)
          )
        );
    }

    // Get existing budgets to check for duplicates (when not overwriting)
    const existingBudgets = overwrite
      ? []
      : await this.db.query.budgets.findMany({
          where: and(
            eq(this.schema.budgets.workspace_id, workspaceId),
            eq(this.schema.budgets.month, targetMonth),
            eq(this.schema.budgets.year, targetYear),
            eq(this.schema.budgets.currency, currency)
          ),
        });

    const existingCategoryIds = new Set(
      existingBudgets.map((b: { category_id: string }) => b.category_id)
    );

    let imported = 0;
    let skipped = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const categoryName = row.category?.trim();
      const budgetAmount = row.budget_amount?.trim();

      if (!categoryName) {
        errors.push({ row: i + 1, message: 'Missing category name' });
        continue;
      }

      const categoryId = categoryMap.get(categoryName.toLowerCase());
      if (!categoryId) {
        errors.push({ row: i + 1, message: `Category "${categoryName}" not found` });
        continue;
      }

      const parsedAmount = parseFloat(budgetAmount);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        errors.push({ row: i + 1, message: `Invalid amount "${budgetAmount}"` });
        continue;
      }

      // Skip if budget already exists for this category (when not overwriting)
      if (!overwrite && existingCategoryIds.has(categoryId)) {
        skipped++;
        continue;
      }

      // Create budget entry
      await this.db.insert(this.schema.budgets).values({
        id: nanoid(),
        workspace_id: workspaceId,
        created_by_user_id: createdByUserId,
        category_id: categoryId,
        month: targetMonth,
        year: targetYear,
        budget_amount: parsedAmount.toString(),
        currency,
      });

      imported++;
    }

    // Invalidate budget cache
    const cache = getCacheManager();
    await cache.invalidateByTags([CacheTags.workspace(workspaceId), CacheTags.BUDGET]);

    return { imported, skipped, errors };
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
    const budget = await this.db.query.budgets.findFirst({
      where: and(eq(this.schema.budgets.id, id), eq(this.schema.budgets.workspace_id, workspaceId)),
    });

    return budget as Budget | null;
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
    currency?: 'IDR' | 'USD'
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
    currency?: 'IDR' | 'USD'
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

    // Copy budgets to target month using bulk insert for atomicity
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

      // Bulk insert for better performance and atomicity
      // Drizzle ORM handles the array insert appropriately for each database driver
      await Promise.resolve(this.db.insert(this.schema.budgets).values(newBudgets));
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
