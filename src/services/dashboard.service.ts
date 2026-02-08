/**
 * Dashboard Service
 * =================
 * Provides aggregated dashboard data via getDashboardData(), which fetches
 * all metrics in parallel using optimized private methods:
 * - Total assets by currency (getAssetsOptimized)
 * - Monthly spending/income/top categories (getTransactionAggregatesOptimized)
 * - Budget health alerts (getBudgetHealthOptimized)
 * - Asset update reminders (getAssetsOptimized)
 * - Recent transactions (getRecentTransactionsOptimized)
 *
 * Error Handling:
 * Methods catch errors and return safe default values (empty arrays, zeroed values).
 * This ensures the service gracefully handles missing database connections or
 * invalid input parameters without throwing exceptions.
 */

import { type IDatabase, getActiveSchema } from '@/db';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const log = createLogger('dashboard');
import { getLatestExchangeRate } from '@/lib/currency/conversion';
import { calculateBudgetAlert } from '@/lib/budget/alerts';
import { calculateAssetPriority } from '@/lib/assets/priority';
import {
  decimalAdd,
  decimalSubtract,
  decimalDivide,
  decimalMultiply,
  decimalSum,
  decimalIsZero,
} from '@/lib/utils/decimal';
import { toHexColor } from '@/lib/utils/colorUtils';
import { getCacheManager, CacheKeys, CacheTags } from '@/lib/cache';
import { type PerfCollector, trackQuery, trackService } from '@/lib/perf';

/**
 * Total assets by currency
 */
export interface TotalAssets {
  idr: string;
  usd: string;
  converted: string; // Total in primary currency (IDR)
  convertedCurrency: 'IDR' | 'USD';
}

/**
 * Monthly spending summary
 */
export interface MonthlySpent {
  total: string;
  budget: string;
  percentage: number;
  remaining: string;
}

/**
 * Monthly income summary
 */
export interface MonthlyIncome {
  total: string;
}

/**
 * Top category expense for spending chart
 */
export interface TopCategoryExpense {
  category: string;
  percentage: number;
  color: string;
  amount: string;
}

/**
 * Budget alert details
 */
export interface BudgetAlert {
  category: string;
  budget: string;
  spent: string;
  percentage: number;
  status: 'warning' | 'exceeded';
  remaining: string;
  overage: string;
}

/**
 * Budget health summary
 */
export interface BudgetHealth {
  alertCount: number;
  status: 'healthy' | 'warning' | 'exceeded';
  alerts: BudgetAlert[];
}

/**
 * Asset update reminder
 */
export interface AssetReminder {
  assetId: string;
  assetName: string;
  assetType: string;
  lastUpdated: Date;
  daysSinceUpdate: number;
  priority: 'high' | 'medium' | 'low';
  currentBalance: string;
  currency: string;
}

/**
 * Complete dashboard data
 */
export interface DashboardData {
  totalAssets: TotalAssets;
  monthlySpent: MonthlySpent;
  monthlyIncome: MonthlyIncome;
  topCategoryExpenses: TopCategoryExpense[];
  budgetHealth: BudgetHealth;
  assetReminders: AssetReminder[];
  recentTransactions: Array<{
    id: string;
    type: 'expense' | 'income' | 'transfer';
    amount: string;
    currency: 'IDR' | 'USD';
    description: string | null;
    transactionDate: Date;
    category: {
      id: string;
      name: string;
      type: 'expense' | 'income';
      icon: string;
      color: string;
    };
    asset: {
      id: string;
      name: string;
      type: string;
    };
    createdByName?: string;
  }>;
}

/**
 * Dashboard data aggregation service
 */
export class DashboardService {
  private schema = getActiveSchema();

  /**
   * Create a new DashboardService with database injection
   * @param db - Database instance (injected for testability)
   */
  constructor(private db: IDatabase) {}

  /**
   * Get complete dashboard data for a workspace (optimized version)
   *
   * This method is optimized to reduce database round-trips by:
   * 1. Combining asset queries (totalAssets + assetReminders use same data)
   * 2. Running all independent queries in parallel
   * 3. Using single aggregate queries where possible
   * 4. Caching results with 1 hour TTL
   *
   * @param workspaceId - Workspace ID
   * @param month - Month (1-12, default: current month)
   * @param year - Year (default: current year)
   * @param currency - Primary currency (default: IDR)
   * @param perf - Optional performance collector for timing metrics
   * @returns Complete dashboard data
   */
  async getDashboardData(
    workspaceId: string,
    month?: number,
    year?: number,
    currency: 'IDR' | 'USD' = 'IDR',
    perf?: PerfCollector
  ): Promise<DashboardData> {
    return trackService('DashboardService.getDashboardData', perf, async () => {
      const now = new Date();
      const currentMonth = month ?? now.getMonth() + 1;
      const currentYear = year ?? now.getFullYear();

      // Try cache first
      const cache = getCacheManager();
      const cacheKey = CacheKeys.dashboard(workspaceId, currentYear, currentMonth, currency);

      const cached = await cache.get<DashboardData>(cacheKey, perf);
      if (cached) {
        return cached;
      }

      // Cache miss - fetch from database
      const startDate = new Date(currentYear, currentMonth - 1, 1);
      const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

      // Run all independent queries in parallel (maximum parallelism)
      // Group 1: Asset-related (single query handles both totalAssets and assetReminders)
      // Group 2: Transaction aggregates (budget, spent, income, categories)
      // Group 3: Budget health (budgets + category spending)
      // Group 4: Recent transactions
      const [assetsData, transactionAggregates, budgetHealthData, recentTransactions] =
        await Promise.all([
          // Combined assets query
          this.getAssetsOptimized(workspaceId, currency, perf),
          // Combined transaction aggregates (budget, spent, income, top categories)
          this.getTransactionAggregatesOptimized(
            workspaceId,
            currentMonth,
            currentYear,
            startDate,
            endDate,
            currency,
            perf
          ),
          // Budget health (requires budgets + spending per category)
          this.getBudgetHealthOptimized(workspaceId, currentMonth, currentYear, currency, perf),
          // Recent transactions
          this.getRecentTransactionsOptimized(workspaceId, 10, perf),
        ]);

      const result: DashboardData = {
        totalAssets: assetsData.totalAssets,
        monthlySpent: transactionAggregates.monthlySpent,
        monthlyIncome: transactionAggregates.monthlyIncome,
        topCategoryExpenses: transactionAggregates.topCategoryExpenses,
        budgetHealth: budgetHealthData,
        assetReminders: assetsData.assetReminders,
        recentTransactions,
      };

      // Cache the result
      await cache.set(cacheKey, result, {
        ttl: 3600,
        tags: [
          CacheTags.workspace(workspaceId),
          CacheTags.DASHBOARD,
          CacheTags.BUDGET,
          CacheTags.TRANSACTIONS,
        ],
      });

      return result;
    });
  }

  /**
   * Optimized assets query - combines totalAssets and assetReminders
   * into a single database query
   */
  private async getAssetsOptimized(
    workspaceId: string,
    primaryCurrency: 'IDR' | 'USD',
    perf?: PerfCollector
  ): Promise<{ totalAssets: TotalAssets; assetReminders: AssetReminder[] }> {
    try {
      if (!this.db?.query?.assets) {
        throw new Error('Database query not available');
      }

      // Single query to get all assets
      const workspaceAssets = await trackQuery('DashboardService.getAssets', perf, async () =>
        this.db.query.assets.findMany({
          where: and(
            eq(this.schema.assets.workspace_id, workspaceId),
            sql`${this.schema.assets.deleted_at} IS NULL`
          ),
        })
      );

      // Calculate totals by currency
      const idrBalances = workspaceAssets.filter((a) => a.currency === 'IDR').map((a) => a.balance);
      const usdBalances = workspaceAssets.filter((a) => a.currency === 'USD').map((a) => a.balance);
      const idrTotal = decimalSum(idrBalances);
      const usdTotal = decimalSum(usdBalances);

      // Get exchange rate for conversion
      const rate = await getLatestExchangeRate();
      const rateString = rate.toString();

      // Convert to primary currency
      let convertedTotal: string;
      if (primaryCurrency === 'IDR') {
        const usdConverted = decimalMultiply(usdTotal, rateString);
        convertedTotal = decimalAdd(idrTotal, usdConverted);
      } else {
        const idrConverted = decimalDivide(idrTotal, rateString);
        convertedTotal = decimalAdd(usdTotal, idrConverted);
      }

      // Calculate asset reminders from the same data
      const reminders: AssetReminder[] = [];
      for (const asset of workspaceAssets) {
        const priorityResult = calculateAssetPriority(asset.last_updated);
        if (priorityResult.needsUpdate) {
          reminders.push({
            assetId: asset.id,
            assetName: asset.name,
            assetType: asset.type,
            lastUpdated: asset.last_updated,
            daysSinceUpdate: priorityResult.daysSinceUpdate,
            priority: priorityResult.priority as 'high' | 'medium' | 'low',
            currentBalance: asset.balance,
            currency: asset.currency,
          });
        }
      }

      // Sort reminders by priority
      const priorityValue = { high: 3, medium: 2, low: 1 };
      reminders.sort((a, b) => {
        const priorityDiff = priorityValue[b.priority] - priorityValue[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.daysSinceUpdate - a.daysSinceUpdate;
      });

      return {
        totalAssets: {
          idr: idrTotal,
          usd: usdTotal,
          converted: convertedTotal,
          convertedCurrency: primaryCurrency,
        },
        assetReminders: reminders,
      };
    } catch (error) {
      log.error('error getting optimized assets:', error);
      return {
        totalAssets: { idr: '0', usd: '0', converted: '0', convertedCurrency: primaryCurrency },
        assetReminders: [],
      };
    }
  }

  /**
   * Optimized transaction aggregates - combines budget, spent, income,
   * and top category expenses into fewer queries
   */
  private async getTransactionAggregatesOptimized(
    workspaceId: string,
    month: number,
    year: number,
    startDate: Date,
    endDate: Date,
    currency: 'IDR' | 'USD',
    perf?: PerfCollector
  ): Promise<{
    monthlySpent: MonthlySpent;
    monthlyIncome: MonthlyIncome;
    topCategoryExpenses: TopCategoryExpense[];
  }> {
    try {
      if (typeof (this.db as any).select !== 'function') {
        throw new Error('Database select not available');
      }

      // Run all transaction queries in parallel (they are independent)
      const [budgetResult, aggregateResult, categoryExpenses] = await Promise.all([
        // Budget total
        trackQuery('DashboardService.getBudgetTotal', perf, async () =>
          (this.db as any)
            .select({
              total: sql<string>`COALESCE(SUM(CAST(${this.schema.budgets.budget_amount} AS REAL)), 0)`,
            })
            .from(this.schema.budgets)
            .innerJoin(
              this.schema.categories,
              eq(this.schema.budgets.category_id, this.schema.categories.id)
            )
            .where(
              and(
                eq(this.schema.budgets.workspace_id, workspaceId),
                eq(this.schema.budgets.month, month),
                eq(this.schema.budgets.year, year),
                eq(this.schema.budgets.currency, currency),
                eq(this.schema.categories.type, 'expense'),
                eq(this.schema.categories.is_active, true)
              )
            )
        ),

        // Combined spent + income query (single query with CASE statements)
        trackQuery('DashboardService.getSpentIncome', perf, async () =>
          (this.db as any)
            .select({
              spent: sql<string>`COALESCE(SUM(CASE WHEN ${this.schema.transactions.type} = 'expense' THEN CAST(${this.schema.transactions.amount} AS REAL) ELSE 0 END), 0)`,
              income: sql<string>`COALESCE(SUM(CASE WHEN ${this.schema.transactions.type} = 'income' THEN CAST(${this.schema.transactions.amount} AS REAL) ELSE 0 END), 0)`,
            })
            .from(this.schema.transactions)
            .where(
              and(
                eq(this.schema.transactions.workspace_id, workspaceId),
                eq(this.schema.transactions.currency, currency),
                gte(this.schema.transactions.transaction_date, startDate),
                lte(this.schema.transactions.transaction_date, endDate),
                sql`${this.schema.transactions.deleted_at} IS NULL`
              )
            )
        ),

        // Top categories
        trackQuery('DashboardService.getTopCategories', perf, async () =>
          (this.db as any)
            .select({
              category_id: this.schema.transactions.category_id,
              category_name: this.schema.categories.name,
              category_color: this.schema.categories.color,
              total: sql<string>`COALESCE(SUM(CAST(${this.schema.transactions.amount} AS REAL)), 0)`,
            })
            .from(this.schema.transactions)
            .innerJoin(
              this.schema.categories,
              eq(this.schema.transactions.category_id, this.schema.categories.id)
            )
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
            .groupBy(
              this.schema.transactions.category_id,
              this.schema.categories.name,
              this.schema.categories.color
            )
            .orderBy(sql`SUM(CAST(${this.schema.transactions.amount} AS REAL)) DESC`)
        ),
      ]);

      const totalBudget = budgetResult[0]?.total || '0';
      const totalSpent = aggregateResult[0]?.spent || '0';
      const totalIncome = aggregateResult[0]?.income || '0';

      // Calculate percentage and remaining
      const percentage = !decimalIsZero(totalBudget)
        ? parseFloat(decimalDivide(decimalMultiply(totalSpent, 100), totalBudget))
        : 0;
      const remaining = decimalSubtract(totalBudget, totalSpent);

      // Process top categories
      const topCategoryExpenses = this.processTopCategories(categoryExpenses);

      return {
        monthlySpent: {
          total: totalSpent,
          budget: totalBudget,
          percentage: Math.round(percentage * 10) / 10,
          remaining,
        },
        monthlyIncome: {
          total: totalIncome,
        },
        topCategoryExpenses,
      };
    } catch (error) {
      log.error('error getting optimized transaction aggregates:', error);
      return {
        monthlySpent: { total: '0', budget: '0', percentage: 0, remaining: '0' },
        monthlyIncome: { total: '0' },
        topCategoryExpenses: [],
      };
    }
  }

  /**
   * Optimized budget health - with perf tracking
   */
  private async getBudgetHealthOptimized(
    workspaceId: string,
    month: number,
    year: number,
    currency: 'IDR' | 'USD',
    perf?: PerfCollector
  ): Promise<BudgetHealth> {
    try {
      // Validate inputs
      if (month < 1 || month > 12) {
        throw new Error(`Invalid month: ${month}. Must be between 1 and 12.`);
      }
      if (year < 2000 || year > 2100) {
        throw new Error(`Invalid year: ${year}. Must be between 2000 and 2100.`);
      }

      // Check if db methods exist (for unit tests with mock db)
      if (!this.db?.query?.budgets || typeof (this.db as any).select !== 'function') {
        throw new Error('Database query not available');
      }

      // Calculate date range for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Get all budgets for the month with their category info
      const monthBudgets = await trackQuery('DashboardService.getBudgets', perf, async () =>
        this.db.query.budgets.findMany({
          where: and(
            eq(this.schema.budgets.workspace_id, workspaceId),
            eq(this.schema.budgets.month, month),
            eq(this.schema.budgets.year, year),
            eq(this.schema.budgets.currency, currency)
          ),
          with: {
            category: true,
          },
        })
      );

      // Filter to only active expense categories
      const expenseBudgets = monthBudgets.filter(
        (b: any) => b.category?.type === 'expense' && b.category?.is_active === true
      );

      // Get total spent per category for the month
      const categorySpending = await trackQuery(
        'DashboardService.getCategorySpending',
        perf,
        async () =>
          (this.db as any)
            .select({
              category_id: this.schema.transactions.category_id,
              total: sql<string>`COALESCE(SUM(CAST(${this.schema.transactions.amount} AS REAL)), 0)`,
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
            .groupBy(this.schema.transactions.category_id)
      );

      // Create map of spending by category
      const spendingByCategory = new Map<string, string>();
      for (const spending of categorySpending) {
        spendingByCategory.set(spending.category_id, spending.total);
      }

      // Calculate alerts for each budget
      const alerts: BudgetAlert[] = [];

      for (const budget of expenseBudgets) {
        const budgetAmount = budget.budget_amount;
        const spent = spendingByCategory.get(budget.category_id) || '0';
        const categoryName = budget.category?.name || 'Unknown';

        const alert = calculateBudgetAlert(categoryName, budgetAmount, spent);
        if (alert) {
          alerts.push(alert);
        }
      }

      // Determine overall status
      let status: 'healthy' | 'warning' | 'exceeded' = 'healthy';
      if (alerts.some((a) => a.status === 'exceeded')) {
        status = 'exceeded';
      } else if (alerts.some((a) => a.status === 'warning')) {
        status = 'warning';
      }

      return {
        alertCount: alerts.length,
        status,
        alerts,
      };
    } catch (error) {
      log.error('error getting budget health:', error);
      // Return empty result on error
      return {
        alertCount: 0,
        status: 'healthy',
        alerts: [],
      };
    }
  }

  /**
   * Optimized recent transactions - with perf tracking
   */
  private async getRecentTransactionsOptimized(
    workspaceId: string,
    limit: number,
    perf?: PerfCollector
  ): Promise<DashboardData['recentTransactions']> {
    try {
      // Validate limit
      if (limit < 1 || limit > 100) {
        throw new Error(`Invalid limit: ${limit}. Must be between 1 and 100.`);
      }

      // Check if db.query exists (for unit tests with mock db)
      if (!this.db?.query?.transactions) {
        throw new Error('Database query not available');
      }

      // Get recent transactions
      const recentTransactions = await trackQuery(
        'DashboardService.getRecentTransactions',
        perf,
        async () =>
          this.db.query.transactions.findMany({
            where: and(
              eq(this.schema.transactions.workspace_id, workspaceId),
              sql`${this.schema.transactions.deleted_at} IS NULL`
            ),
            with: {
              category: true,
              asset: true,
              createdBy: { columns: { id: true, name: true } },
            },
            orderBy: [
              desc(this.schema.transactions.transaction_date),
              desc(this.schema.transactions.created_at),
            ],
            limit,
          })
      );

      // Map transaction_date to transactionDate for the return type
      return recentTransactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        description: tx.description,
        transactionDate: tx.transaction_date,
        category: {
          id: tx.category.id,
          name: tx.category.name,
          type: tx.category.type,
          icon: tx.category.icon,
          color: tx.category.color,
        },
        asset: {
          id: tx.asset.id,
          name: tx.asset.name,
          type: tx.asset.type,
        },
        createdByName: tx.createdBy?.name,
      }));
    } catch (error) {
      log.error('error getting recent transactions:', error);
      // Return empty array on error
      return [];
    }
  }

  /**
   * Process top category expenses from query result
   */
  private processTopCategories(categoryExpenses: any[]): TopCategoryExpense[] {
    if (categoryExpenses.length === 0) {
      return [];
    }

    const totalSpent = categoryExpenses.reduce(
      (sum: number, cat: any) => sum + parseFloat(cat.total || '0'),
      0
    );

    if (totalSpent === 0) {
      return [];
    }

    const defaultColors = ['#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'];

    const top4 = categoryExpenses.slice(0, 4);
    const result: TopCategoryExpense[] = top4.map((cat: any, index: number) => ({
      category: cat.category_name,
      percentage: Math.round((parseFloat(cat.total) / totalSpent) * 100),
      color: toHexColor(cat.category_color, defaultColors[index % defaultColors.length]),
      amount: cat.total,
    }));

    if (categoryExpenses.length > 4) {
      const otherCategories = categoryExpenses.slice(4);
      const otherTotal = otherCategories.reduce(
        (sum: number, cat: any) => sum + parseFloat(cat.total || '0'),
        0
      );
      const otherPercentage = Math.round((otherTotal / totalSpent) * 100);

      result.push({
        category: 'Other',
        percentage: otherPercentage,
        color: '#6b7280',
        amount: otherTotal.toString(),
      });
    }

    return result;
  }
}
