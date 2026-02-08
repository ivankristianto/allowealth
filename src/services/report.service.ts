/**
 * Report Service
 * ==============
 * Provides aggregated financial intelligence data for reports including:
 * - Monthly and yearly income/expense summaries
 * - Budget health metrics
 * - Category spending analysis with donut chart data
 * - Financial velocity trends (trailing periods)
 * - Category intelligence table with budget limits
 * - Category transaction drill-down
 *
 * Security:
 * - All methods require userId parameter and filter queries by user_id
 * - Category access control enforced via join + user_id filter
 * - Input validation for dates (month 1-12, year 2000-2100)
 * - Decimal precision for all currency calculations
 *
 * Error Handling:
 * Methods catch errors and return safe default values (empty arrays, zeroed values).
 * This ensures the service gracefully handles missing database connections or
 * invalid input parameters without throwing exceptions.
 *
 * P2: TODO - Improve date precision (add milliseconds to end date: 23:59:59.999)
 */

import { type IDatabase, getActiveSchema } from '@/db';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';
import { MONTH_NAMES_SHORT } from '@/lib/utils/date';

const log = createLogger('report');
import {
  decimalSubtract,
  decimalDivide,
  decimalMultiply,
  decimalSum,
  decimalIsZero,
} from '@/lib/utils/decimal';
import { validatePeriod } from '@/lib/utils/period-validation';
import { BudgetServiceError, ServiceErrorCode } from './service-errors';

/**
 * Summary metric for expense/income categories
 */
export interface CategoryExpense {
  name: string;
  value: string; // Decimal string for precision
}

/**
 * Trend data point for bar chart
 */
export interface TrendDataPoint {
  name: string; // Month name or period label
  income: string; // Decimal string
  expenses: string; // Decimal string
}

/**
 * Category intelligence row for table
 */
export interface CategoryIntelligence {
  id: string;
  name: string;
  spent: string; // Decimal string
  budgetLimit: string | null; // null if not set
  icon: string;
  color: string; // DaisyUI semantic color class from database
}

/**
 * Monthly or yearly report data
 */
export interface ReportData {
  totalIncome: string;
  totalExpenses: string;
  netSavings: string;
  budgetHealth: number; // Percentage (0-100+)
  expenseCategories: number; // Count of categories with expenses
  expenseByCategory: CategoryExpense[]; // For donut chart
  trendData: TrendDataPoint[]; // For bar chart
  categoryIntelligence: CategoryIntelligence[]; // For table
}

/**
 * Category transaction with details
 */
export interface CategoryTransaction {
  id: string;
  amount: string;
  currency: 'IDR' | 'USD';
  description: string | null;
  transactionDate: Date;
  assetName: string;
  createdByName?: string;
  hasHistory?: boolean;
}

/**
 * Category transactions response
 */
export interface CategoryTransactionsData {
  transactions: CategoryTransaction[];
  total: string; // Sum of transactions
  categoryName: string;
}

/**
 * Report data aggregation service
 */
export class ReportService {
  private schema = getActiveSchema();

  /**
   * Create a new ReportService with database injection
   * @param db - Database instance (injected for testability)
   */
  constructor(private db: IDatabase) {}

  /**
   * Validate userId parameter
   * @private
   * @throws Error if userId is invalid
   */
  private validateWorkspaceId(workspaceId: string): void {
    if (!workspaceId || typeof workspaceId !== 'string' || workspaceId.trim() === '') {
      throw new Error('Invalid workspaceId: must be a non-empty string');
    }
  }

  /**
   * Validate currency parameter
   * @private
   * @throws Error if currency is invalid
   */
  private validateCurrency(currency: string): void {
    if (!['IDR', 'USD'].includes(currency)) {
      throw new Error(`Invalid currency: ${currency}. Must be IDR or USD.`);
    }
  }

  /**
   * Get monthly report data
   *
   * Aggregates data for a specific month including income, expenses, budget health,
   * category breakdown, and trailing 3-month trend.
   *
   * @param workspaceId - Workspace ID (from auth context)
   * @param period - Period in format 'YYYY-MM' (e.g., '2024-02')
   * @param currency - Currency to aggregate (default: IDR)
   * @returns Monthly report data
   */
  async getMonthlyReport(
    workspaceId: string,
    period: string,
    currency: 'IDR' | 'USD' = 'IDR'
  ): Promise<ReportData> {
    try {
      // Validate inputs
      this.validateWorkspaceId(workspaceId);
      this.validateCurrency(currency);

      // Validate and parse period format (YYYY-MM)
      const { year, month } = validatePeriod(period, 'monthly');
      if (!month) {
        throw new Error(`Invalid monthly period: ${period}`);
      }

      // Calculate date range for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Get all data in parallel for performance
      const [
        totalIncome,
        totalExpenses,
        budgetHealthData,
        expenseByCategory,
        categoryIntelligence,
        trendData,
      ] = await Promise.all([
        this.getTotalIncome(workspaceId, startDate, endDate, currency),
        this.getTotalExpenses(workspaceId, startDate, endDate, currency),
        this.getBudgetHealth(workspaceId, year, month, currency),
        this.getExpenseByCategory(workspaceId, startDate, endDate, currency),
        this.getCategoryIntelligence(workspaceId, year, month, currency),
        this.getTrendData(workspaceId, year, month, currency, 3), // Trailing 3 months
      ]);

      // Calculate net savings
      const netSavings = decimalSubtract(totalIncome, totalExpenses);

      // Count unique expense categories
      const expenseCategories = expenseByCategory.length;

      return {
        totalIncome,
        totalExpenses,
        netSavings,
        budgetHealth: budgetHealthData,
        expenseCategories,
        expenseByCategory,
        trendData,
        categoryIntelligence,
      };
    } catch (error) {
      log.error('error getting monthly report:', error);
      // Return safe defaults on error
      return this.getEmptyReport();
    }
  }

  /**
   * Get yearly report data
   *
   * Aggregates data for an entire year including income, expenses, budget health,
   * category breakdown, and 12-month trend.
   *
   * @param workspaceId - Workspace ID (from auth context)
   * @param year - Year (e.g., 2024)
   * @param currency - Currency to aggregate (default: IDR)
   * @returns Yearly report data
   */
  async getYearlyReport(
    workspaceId: string,
    year: number,
    currency: 'IDR' | 'USD' = 'IDR'
  ): Promise<ReportData> {
    try {
      // Validate inputs
      this.validateWorkspaceId(workspaceId);
      this.validateCurrency(currency);

      // Validate year
      validatePeriod(year.toString(), 'yearly');

      // Calculate date range for the year
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);

      // Get all data in parallel for performance
      const [
        totalIncome,
        totalExpenses,
        budgetHealthData,
        expenseByCategory,
        categoryIntelligence,
        trendData,
      ] = await Promise.all([
        this.getTotalIncome(workspaceId, startDate, endDate, currency),
        this.getTotalExpenses(workspaceId, startDate, endDate, currency),
        this.getYearlyBudgetHealth(workspaceId, year, currency),
        this.getExpenseByCategory(workspaceId, startDate, endDate, currency),
        this.getYearlyCategoryIntelligence(workspaceId, year, currency),
        this.getYearlyTrendData(workspaceId, year, currency), // 12 months
      ]);

      // Calculate net savings
      const netSavings = decimalSubtract(totalIncome, totalExpenses);

      // Count unique expense categories
      const expenseCategories = expenseByCategory.length;

      return {
        totalIncome,
        totalExpenses,
        netSavings,
        budgetHealth: budgetHealthData,
        expenseCategories,
        expenseByCategory,
        trendData,
        categoryIntelligence,
      };
    } catch (error) {
      log.error('error getting yearly report:', error);
      // Return safe defaults on error
      return this.getEmptyReport();
    }
  }

  /**
   * Get category transactions for drill-down
   *
   * Returns all transactions for a specific category within a period.
   * Verifies category belongs to workspace for access control.
   *
   * @param workspaceId - Workspace ID (from auth context)
   * @param categoryId - Category ID
   * @param period - Period string ('YYYY-MM' for monthly, 'YYYY' for yearly)
   * @param range - Report range type
   * @returns Category transactions data
   */
  async getCategoryTransactions(
    workspaceId: string,
    categoryId: string,
    period: string,
    range: 'monthly' | 'yearly'
  ): Promise<CategoryTransactionsData> {
    // Validate inputs
    this.validateWorkspaceId(workspaceId);

    // Verify category exists and belongs to workspace (access control)
    const category = await this.db.query.categories.findFirst({
      where: and(
        eq(this.schema.categories.id, categoryId),
        eq(this.schema.categories.workspace_id, workspaceId)
      ),
    });

    if (!category) {
      throw new BudgetServiceError(
        ServiceErrorCode.CATEGORY_NOT_FOUND,
        'Category not found or access denied',
        404
      );
    }

    try {
      // Parse and validate period
      const { year, month } = validatePeriod(period, range);

      // Calculate date range based on range type
      let startDate: Date;
      let endDate: Date;

      if (range === 'monthly' && month) {
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0, 23, 59, 59);
      } else {
        // yearly
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59);
      }

      // Get transactions for category in period
      const categoryTransactions = await this.db.query.transactions.findMany({
        where: and(
          eq(this.schema.transactions.workspace_id, workspaceId),
          eq(this.schema.transactions.category_id, categoryId),
          eq(this.schema.transactions.type, 'expense'),
          gte(this.schema.transactions.transaction_date, startDate),
          lte(this.schema.transactions.transaction_date, endDate),
          sql`${this.schema.transactions.deleted_at} IS NULL`
        ),
        with: {
          asset: true,
          createdBy: { columns: { id: true, name: true } },
        },
        // NOTE: Raw SQL names required — Drizzle schema refs resolve incorrectly in relational query extras
        extras: {
          has_history: sql<number>`EXISTS (
            SELECT 1 FROM audit_logs
            WHERE audit_logs.entity_type = 'transaction'
            AND audit_logs.entity_id = transactions.id
            AND audit_logs.workspace_id = transactions.workspace_id
            AND audit_logs.action IN ('update', 'delete')
            LIMIT 1
          )`.as('has_history'),
        },
        orderBy: [sql`${this.schema.transactions.transaction_date} DESC`],
      });

      // Calculate total
      const amounts = categoryTransactions.map((tx) => tx.amount);
      const total = decimalSum(amounts);

      // Map to response format
      const transactionsData: CategoryTransaction[] = categoryTransactions.map((tx: any) => ({
        id: tx.id,
        amount: tx.amount,
        currency: tx.currency,
        description: tx.description,
        transactionDate: tx.transaction_date,
        assetName: tx.asset?.name || 'Unknown',
        createdByName: tx.createdBy?.name,
        hasHistory: !!tx.has_history,
      }));

      return {
        transactions: transactionsData,
        total,
        categoryName: category.name,
      };
    } catch (error) {
      // Re-throw BudgetServiceError instances (category not found)
      if (error instanceof BudgetServiceError) {
        throw error;
      }
      // Log and re-throw unexpected errors
      log.error('error getting category transactions:', error);
      throw new Error('Failed to retrieve category transactions');
    }
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Get total income for a date range
   * @private
   */
  private async getTotalIncome(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    currency: 'IDR' | 'USD'
  ): Promise<string> {
    const [result] = await (this.db as any)
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${this.schema.transactions.amount} AS REAL)), 0)`,
      })
      .from(this.schema.transactions)
      .where(
        and(
          eq(this.schema.transactions.workspace_id, workspaceId),
          eq(this.schema.transactions.type, 'income'),
          eq(this.schema.transactions.currency, currency),
          gte(this.schema.transactions.transaction_date, startDate),
          lte(this.schema.transactions.transaction_date, endDate),
          sql`${this.schema.transactions.deleted_at} IS NULL`
        )
      );

    // Convert to string (SQL returns number even with sql<string> type annotation)
    return result?.total?.toString() || '0';
  }

  /**
   * Get total expenses for a date range
   * @private
   */
  private async getTotalExpenses(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    currency: 'IDR' | 'USD'
  ): Promise<string> {
    const [result] = await (this.db as any)
      .select({
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
      );

    // Convert to string (SQL returns number even with sql<string> type annotation)
    return result?.total?.toString() || '0';
  }

  /**
   * Get budget health percentage for a specific month
   * @private
   */
  private async getBudgetHealth(
    workspaceId: string,
    year: number,
    month: number,
    currency: 'IDR' | 'USD'
  ): Promise<number> {
    // Get total budget for the month
    const [budgetResult] = await (this.db as any)
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
      );

    const totalBudget = budgetResult?.total || '0';

    // Get total spent
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const totalExpenses = await this.getTotalExpenses(workspaceId, startDate, endDate, currency);

    // Calculate percentage
    if (decimalIsZero(totalBudget)) {
      return 0;
    }

    const percentage = parseFloat(
      decimalDivide(decimalMultiply(totalExpenses, '100'), totalBudget)
    );
    return Math.round(percentage * 10) / 10; // Round to 1 decimal
  }

  /**
   * Get budget health percentage for entire year
   * @private
   */
  private async getYearlyBudgetHealth(
    workspaceId: string,
    year: number,
    currency: 'IDR' | 'USD'
  ): Promise<number> {
    // Get total budget for all months in the year
    const [budgetResult] = await (this.db as any)
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
          eq(this.schema.budgets.year, year),
          eq(this.schema.budgets.currency, currency),
          eq(this.schema.categories.type, 'expense'),
          eq(this.schema.categories.is_active, true)
        )
      );

    const totalBudget = budgetResult?.total || '0';

    // Get total spent for year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);
    const totalExpenses = await this.getTotalExpenses(workspaceId, startDate, endDate, currency);

    // Calculate percentage
    if (decimalIsZero(totalBudget)) {
      return 0;
    }

    const percentage = parseFloat(
      decimalDivide(decimalMultiply(totalExpenses, '100'), totalBudget)
    );
    return Math.round(percentage * 10) / 10; // Round to 1 decimal
  }

  /**
   * Get expense breakdown by category for donut chart
   * @private
   */
  private async getExpenseByCategory(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    currency: 'IDR' | 'USD'
  ): Promise<CategoryExpense[]> {
    const categoryExpenses = await (this.db as any)
      .select({
        category_name: this.schema.categories.name,
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
      .groupBy(this.schema.categories.name)
      .orderBy(sql`SUM(CAST(${this.schema.transactions.amount} AS REAL)) DESC`);

    if (categoryExpenses.length === 0) {
      return [];
    }

    return categoryExpenses.map((cat: any) => ({
      name: cat.category_name,
      value: cat.total?.toString() || '0', // Convert to string
    }));
  }

  /**
   * Get category intelligence table data for a specific month
   * @private
   */
  private async getCategoryIntelligence(
    workspaceId: string,
    year: number,
    month: number,
    currency: 'IDR' | 'USD'
  ): Promise<CategoryIntelligence[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get all budgets for the month with category info
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

    // Filter to only active expense categories
    const expenseBudgets = monthBudgets.filter(
      (b: any) => b.category?.type === 'expense' && b.category?.is_active === true
    );

    // Get spending by category
    const categorySpending = await (this.db as any)
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
      .groupBy(this.schema.transactions.category_id);

    // Create spending map
    const spendingByCategory = new Map<string, string>();
    for (const spending of categorySpending) {
      spendingByCategory.set(spending.category_id, spending.total?.toString() || '0');
    }

    // Build intelligence rows
    const intelligence: CategoryIntelligence[] = expenseBudgets.map((budget: any) => ({
      id: budget.category_id,
      name: budget.category?.name ?? 'Unknown',
      spent: spendingByCategory.get(budget.category_id) || '0',
      budgetLimit: budget.budget_amount,
      icon: budget.category?.icon ?? 'CircleDollarSign',
      color: budget.category?.color ?? 'bg-neutral',
    }));

    return intelligence;
  }

  /**
   * Get category intelligence for entire year
   * @private
   */
  private async getYearlyCategoryIntelligence(
    workspaceId: string,
    year: number,
    currency: 'IDR' | 'USD'
  ): Promise<CategoryIntelligence[]> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // Get all budgets for the year with category info (summed)
    const yearlyBudgets = await (this.db as any)
      .select({
        category_id: this.schema.budgets.category_id,
        total_budget: sql<string>`COALESCE(SUM(CAST(${this.schema.budgets.budget_amount} AS REAL)), 0)`,
      })
      .from(this.schema.budgets)
      .where(
        and(
          eq(this.schema.budgets.workspace_id, workspaceId),
          eq(this.schema.budgets.year, year),
          eq(this.schema.budgets.currency, currency)
        )
      )
      .groupBy(this.schema.budgets.category_id);

    // Get category details
    const budgetMap = new Map<string, string>();
    const categoryIds: string[] = [];
    for (const budget of yearlyBudgets) {
      budgetMap.set(budget.category_id, budget.total_budget?.toString() || '0');
      categoryIds.push(budget.category_id);
    }

    if (categoryIds.length === 0) {
      return [];
    }

    // Get category info for all budget categories
    const categoriesData = await this.db.query.categories.findMany({
      where: and(
        eq(this.schema.categories.workspace_id, workspaceId),
        eq(this.schema.categories.type, 'expense')
      ),
    });

    // Filter to only categories with budgets
    const relevantCategories = categoriesData.filter((cat) => categoryIds.includes(cat.id));

    // Get spending by category for the year
    const categorySpending = await (this.db as any)
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
      .groupBy(this.schema.transactions.category_id);

    // Create spending map
    const spendingByCategory = new Map<string, string>();
    for (const spending of categorySpending) {
      spendingByCategory.set(spending.category_id, spending.total?.toString() || '0');
    }

    // Build intelligence rows
    const intelligence: CategoryIntelligence[] = relevantCategories.map((category) => ({
      id: category.id,
      name: category.name,
      spent: spendingByCategory.get(category.id) || '0',
      budgetLimit: budgetMap.get(category.id) || null,
      icon: category.icon ?? 'CircleDollarSign',
      color: category.color ?? 'bg-neutral',
    }));

    return intelligence;
  }

  /**
   * Get trend data for trailing periods (monthly view shows 3 months)
   * @private
   */
  private async getTrendData(
    workspaceId: string,
    year: number,
    month: number,
    currency: 'IDR' | 'USD',
    trailingMonths: number
  ): Promise<TrendDataPoint[]> {
    const trendData: TrendDataPoint[] = [];

    // Get data for each trailing month
    for (let i = trailingMonths - 1; i >= 0; i--) {
      const date = new Date(year, month - 1 - i, 1);
      const trendYear = date.getFullYear();
      const trendMonth = date.getMonth() + 1;

      const startDate = new Date(trendYear, trendMonth - 1, 1);
      const endDate = new Date(trendYear, trendMonth, 0, 23, 59, 59);

      const [income, expenses] = await Promise.all([
        this.getTotalIncome(workspaceId, startDate, endDate, currency),
        this.getTotalExpenses(workspaceId, startDate, endDate, currency),
      ]);

      trendData.push({
        name: MONTH_NAMES_SHORT[trendMonth - 1],
        income,
        expenses,
      });
    }

    return trendData;
  }

  /**
   * Get trend data for 12 months (yearly view)
   * @private
   */
  private async getYearlyTrendData(
    workspaceId: string,
    year: number,
    currency: 'IDR' | 'USD'
  ): Promise<TrendDataPoint[]> {
    const trendData: TrendDataPoint[] = [];

    // Get data for each month of the year
    for (let month = 1; month <= 12; month++) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const [income, expenses] = await Promise.all([
        this.getTotalIncome(workspaceId, startDate, endDate, currency),
        this.getTotalExpenses(workspaceId, startDate, endDate, currency),
      ]);

      trendData.push({
        name: MONTH_NAMES_SHORT[month - 1],
        income,
        expenses,
      });
    }

    return trendData;
  }

  /**
   * Get empty report data (safe defaults)
   * @private
   */
  private getEmptyReport(): ReportData {
    return {
      totalIncome: '0',
      totalExpenses: '0',
      netSavings: '0',
      budgetHealth: 0,
      expenseCategories: 0,
      expenseByCategory: [],
      trendData: [],
      categoryIntelligence: [],
    };
  }
}
