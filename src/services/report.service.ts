/**
 * Report Service
 * ==============
 * Provides aggregated financial data for reports including:
 * - Monthly and yearly income/expense summaries
 * - Budget health metrics
 * - Category spending analysis with donut chart data
 * - Income vs. expense trends (trailing periods)
 * - Category spending table with budget limits
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
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';
import { getDatabaseConfig } from '@/db/config';
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
import { isValidCurrency } from '@/lib/constants/currency';
import { PAGINATION } from '@/lib/constants/pagination';

/**
 * Summary metric for expense/income categories
 */
export interface CategoryExpense {
  name: string;
  value: string; // Decimal string for precision
}

/**
 * Income category with source type classification
 */
export interface IncomeCategoryExpense extends CategoryExpense {
  sourceType: 'active' | 'passive' | 'other';
}

/**
 * Trend data point for bar chart
 */
export interface TrendDataPoint {
  name: string; // Month name or period label
  income: string; // Decimal string
  expenses: string; // Decimal string
}

export interface MonthlyNetSavingsByMonthRow {
  income: string;
  expenses: string;
  netSavings: string;
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
  currency: Currency;
  description: string | null;
  transactionDate: Date;
  accountName: string;
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
  categoryType: 'expense' | 'income';
  totalCount: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Per-member spending summary row
 */
export interface MemberSummaryRow {
  userId: string;
  userName: string;
  totalIncome: string;
  totalExpenses: string;
  netSavings: string;
  transactionCount: number;
}

export interface RecurringBreakdown {
  recurringTotal: string;
  oneTimeTotal: string;
  recurringByCategory: Array<{
    category_id: string;
    category_name: string;
    amount: string;
  }>;
}

export interface OverviewReportData {
  totalIncome: string;
  totalExpenses: string;
  netSavings: string;
  savingsRate: string;
  trendData: TrendDataPoint[];
  incomePreview: { topCategories: CategoryExpense[]; total: string };
  expensePreview: { topCategories: CategoryExpense[]; total: string };
}

export interface ExpenseReportData extends ReportData {
  recurringBreakdown: RecurringBreakdown | null;
  memberSummary: MemberSummaryRow[];
}

export interface IncomeHistoryData {
  transactions: Array<{
    id: string;
    description: string;
    amount: string;
    currency: string;
    transaction_date: string;
    category_name: string;
    category_icon: string;
    category_color: string;
    income_source_type: string;
    created_by_name: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
  appliedFilters: {
    userId?: string;
    sourceType?: 'active' | 'passive' | 'other';
    categoryId?: string;
  };
}

export interface IncomeReportFilters {
  userId?: string;
  sourceType?: 'active' | 'passive' | 'other';
  categoryId?: string;
  page?: number;
  pageSize?: number;
}

export interface IncomeReportData {
  summary: {
    totalIncome: string;
    activeIncome: string;
    passiveIncome: string;
    otherIncome: string;
    growthVsPreviousPeriod: string;
    previousPeriodLabel: string;
  };
  sourceMix: IncomeCategoryExpense[];
  sourceGroupTrend: Array<{ name: string; active: string; passive: string; other: string }>;
  members: Array<{
    userId: string;
    userName: string;
    totalIncome: string;
    transactionCount: number;
  }>;
  history: IncomeHistoryData;
}

/**
 * Report data aggregation service
 */
export class ReportService {
  private get schema() {
    return getActiveSchema();
  }

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
    if (!isValidCurrency(currency)) {
      throw new Error(`Invalid currency: ${currency}.`);
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
    currency: Currency = 'IDR',
    userId?: string
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
        this.getTotalIncome(workspaceId, startDate, endDate, currency, userId),
        this.getTotalExpenses(workspaceId, startDate, endDate, currency, userId),
        this.getBudgetHealth(workspaceId, year, month, currency, userId),
        this.getExpenseByCategory(workspaceId, startDate, endDate, currency, userId),
        this.getCategoryIntelligence(workspaceId, year, month, currency, userId),
        this.getTrendData(workspaceId, year, month, currency, 3, userId), // Trailing 3 months
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
    currency: Currency = 'IDR',
    userId?: string
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
        this.getTotalIncome(workspaceId, startDate, endDate, currency, userId),
        this.getTotalExpenses(workspaceId, startDate, endDate, currency, userId),
        this.getYearlyBudgetHealth(workspaceId, year, currency, userId),
        this.getExpenseByCategory(workspaceId, startDate, endDate, currency, userId),
        this.getYearlyCategoryIntelligence(workspaceId, year, currency, userId),
        this.getYearlyTrendData(workspaceId, year, currency, userId), // 12 months
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

  async getRecurringBreakdown(
    workspaceId: string,
    year: number,
    month: number,
    currency: Currency = 'IDR'
  ): Promise<RecurringBreakdown> {
    this.validateWorkspaceId(workspaceId);
    this.validateCurrency(currency);

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new Error('Invalid year');
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error('Invalid month');
    }

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);

    const tx = this.schema.transactions;
    const ro = this.schema.recurringOccurrences;
    const categories = this.schema.categories;

    const [totals] = await (this.db as any)
      .select({
        recurring_total: sql<string>`COALESCE(SUM(CASE WHEN EXISTS (
          SELECT 1 FROM ${ro}
          WHERE ${ro.workspace_id} = ${tx.workspace_id}
            AND ${ro.status} = 'confirmed'
            AND ${ro.transaction_id} = ${tx.id}
        ) THEN CAST(${tx.amount} AS NUMERIC) ELSE 0 END), 0)`,
        one_time_total: sql<string>`COALESCE(SUM(CASE WHEN EXISTS (
          SELECT 1 FROM ${ro}
          WHERE ${ro.workspace_id} = ${tx.workspace_id}
            AND ${ro.status} = 'confirmed'
            AND ${ro.transaction_id} = ${tx.id}
        ) THEN 0 ELSE CAST(${tx.amount} AS NUMERIC) END), 0)`,
      })
      .from(tx)
      .where(
        and(
          eq(tx.workspace_id, workspaceId),
          eq(tx.type, 'expense'),
          eq(tx.currency, currency),
          gte(tx.transaction_date, monthStart),
          lte(tx.transaction_date, monthEnd),
          sql`${tx.deleted_at} IS NULL`
        )
      );

    const recurringByCategoryRows = await (this.db as any)
      .select({
        category_id: tx.category_id,
        category_name: categories.name,
        amount: sql<string>`COALESCE(SUM(CAST(${tx.amount} AS NUMERIC)), 0)`,
      })
      .from(tx)
      .innerJoin(categories, eq(tx.category_id, categories.id))
      .where(
        and(
          eq(tx.workspace_id, workspaceId),
          eq(tx.type, 'expense'),
          eq(tx.currency, currency),
          gte(tx.transaction_date, monthStart),
          lte(tx.transaction_date, monthEnd),
          sql`${tx.deleted_at} IS NULL`,
          sql`EXISTS (
            SELECT 1 FROM ${ro}
            WHERE ${ro.workspace_id} = ${tx.workspace_id}
              AND ${ro.status} = 'confirmed'
              AND ${ro.transaction_id} = ${tx.id}
          )`
        )
      )
      .groupBy(tx.category_id, categories.name);

    return {
      recurringTotal: totals?.recurring_total?.toString() || '0',
      oneTimeTotal: totals?.one_time_total?.toString() || '0',
      recurringByCategory: recurringByCategoryRows.map((row: any) => ({
        category_id: row.category_id,
        category_name: row.category_name || 'Unknown',
        amount: row.amount?.toString() || '0',
      })),
    };
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
   * @param currency - Currency to filter by
   * @returns Category transactions data
   */
  async getCategoryTransactions(
    workspaceId: string,
    categoryId: string,
    period: string,
    range: 'monthly' | 'yearly',
    currency: Currency,
    options: {
      limit?: number;
      offset?: number;
      type?: 'expense' | 'income';
    } = {}
  ): Promise<CategoryTransactionsData> {
    // Validate inputs
    this.validateWorkspaceId(workspaceId);
    this.validateCurrency(currency);

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

      const requestedLimit = Number.isFinite(options.limit) ? Number(options.limit) : 100;
      const requestedOffset = Number.isFinite(options.offset) ? Number(options.offset) : 0;
      const limit = Math.min(500, Math.max(1, Math.floor(requestedLimit)));
      const offset = Math.max(0, Math.floor(requestedOffset));
      const transactionType = options.type || (category.type === 'income' ? 'income' : 'expense');
      const whereClause = and(
        eq(this.schema.transactions.workspace_id, workspaceId),
        eq(this.schema.transactions.category_id, categoryId),
        eq(this.schema.transactions.type, transactionType),
        eq(this.schema.transactions.currency, currency),
        gte(this.schema.transactions.transaction_date, startDate),
        lte(this.schema.transactions.transaction_date, endDate),
        sql`${this.schema.transactions.deleted_at} IS NULL`
      );

      const countResult = await (this.db as any)
        .select({ count: sql<number>`count(*)` })
        .from(this.schema.transactions)
        .where(whereClause);
      const totalCount = Number(countResult[0]?.count ?? 0);

      // Get transactions for category in period
      const categoryTransactions = await this.db.query.transactions.findMany({
        where: whereClause,
        with: {
          account: true,
          createdBy: { columns: { id: true, name: true } },
        },
        limit,
        offset,
        orderBy: [sql`${this.schema.transactions.transaction_date} DESC`],
      });

      const txIds = categoryTransactions.map((transaction) => transaction.id);
      const historyTxIds =
        txIds.length === 0
          ? new Set<string>()
          : await this.getTransactionIdsWithHistory(workspaceId, txIds);

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
        accountName: tx.account?.name || 'Unknown',
        createdByName: tx.createdBy?.name,
        hasHistory: historyTxIds.has(tx.id),
      }));

      return {
        transactions: transactionsData,
        total,
        categoryName: category.name,
        categoryType: category.type === 'income' ? 'income' : 'expense',
        totalCount,
        limit,
        offset,
        hasMore: offset + transactionsData.length < totalCount,
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

  /**
   * Get per-member spending summary for a period
   *
   * Returns income, expenses, net savings, and transaction count for each
   * workspace member who has transactions in the given period.
   *
   * @param workspaceId - Workspace ID
   * @param period - Period string ('YYYY-MM' for monthly, 'YYYY' for yearly)
   * @param range - 'monthly' or 'yearly'
   * @param currency - Currency to aggregate
   * @returns Array of per-member summaries, sorted by total expenses descending
   */
  async getMemberSummary(
    workspaceId: string,
    period: string,
    range: 'monthly' | 'yearly',
    currency: Currency = 'IDR'
  ): Promise<MemberSummaryRow[]> {
    this.validateWorkspaceId(workspaceId);
    this.validateCurrency(currency);

    let startDate: Date;
    let endDate: Date;

    if (range === 'monthly') {
      const { year, month } = validatePeriod(period, 'monthly');
      if (!month) throw new Error(`Invalid monthly period: ${period}`);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    } else {
      const { year } = validatePeriod(period, 'yearly');
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
    }

    const incomeByUser = await (this.db as any)
      .select({
        user_id: this.schema.transactions.created_by_user_id,
        total: sql<string>`COALESCE(SUM(CAST(${this.schema.transactions.amount} AS NUMERIC)), 0)`,
        count: sql<number>`COUNT(*)`,
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
      )
      .groupBy(this.schema.transactions.created_by_user_id);

    const expensesByUser = await (this.db as any)
      .select({
        user_id: this.schema.transactions.created_by_user_id,
        total: sql<string>`COALESCE(SUM(CAST(${this.schema.transactions.amount} AS NUMERIC)), 0)`,
        count: sql<number>`COUNT(*)`,
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
      .groupBy(this.schema.transactions.created_by_user_id);

    const members = await this.db.query.users.findMany({
      where: and(
        eq(this.schema.users.workspace_id, workspaceId),
        sql`${this.schema.users.deleted_at} IS NULL`
      ),
    });

    const memberMap = new Map(
      members.map((member: any) => [member.id, member.name || member.email])
    );

    const incomeMap = new Map<string, { total: string; count: number }>();
    for (const row of incomeByUser) {
      incomeMap.set(row.user_id, {
        total: row.total?.toString() || '0',
        count: Number(row.count) || 0,
      });
    }

    const expenseMap = new Map<string, { total: string; count: number }>();
    for (const row of expensesByUser) {
      expenseMap.set(row.user_id, {
        total: row.total?.toString() || '0',
        count: Number(row.count) || 0,
      });
    }

    const allUserIds = new Set([...incomeMap.keys(), ...expenseMap.keys()]);

    const results: MemberSummaryRow[] = [];
    for (const userId of allUserIds) {
      const income = incomeMap.get(userId)?.total || '0';
      const expenses = expenseMap.get(userId)?.total || '0';
      const incomeCount = incomeMap.get(userId)?.count || 0;
      const expenseCount = expenseMap.get(userId)?.count || 0;

      results.push({
        userId,
        userName: memberMap.get(userId) || 'Unknown',
        totalIncome: income,
        totalExpenses: expenses,
        netSavings: decimalSubtract(income, expenses),
        transactionCount: incomeCount + expenseCount,
      });
    }

    results.sort((a, b) => {
      const aExp = parseFloat(a.totalExpenses) || 0;
      const bExp = parseFloat(b.totalExpenses) || 0;
      return bExp - aExp;
    });

    return results;
  }

  /**
   * Get workspace-level monthly income, expenses, and net savings keyed by YYYY-MM.
   */
  async getMonthlyNetSavingsByMonth(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    currency: Currency = 'IDR'
  ): Promise<Map<string, MonthlyNetSavingsByMonthRow>> {
    this.validateWorkspaceId(workspaceId);
    this.validateCurrency(currency);

    const aggregateMap = await this.getTrendAggregateByMonth(
      workspaceId,
      startDate,
      endDate,
      currency
    );

    const result = new Map<string, MonthlyNetSavingsByMonthRow>();
    for (const [monthKey, row] of aggregateMap.entries()) {
      result.set(monthKey, {
        income: row.income,
        expenses: row.expenses,
        netSavings: decimalSubtract(row.income, row.expenses),
      });
    }

    return result;
  }

  /**
   * Get overview report — lightweight cross-ledger summary
   */
  async getOverviewReport(
    workspaceId: string,
    period: string,
    range: 'monthly' | 'yearly',
    currency: Currency = 'IDR',
    userId?: string
  ): Promise<OverviewReportData> {
    try {
      this.validateWorkspaceId(workspaceId);
      this.validateCurrency(currency);

      let startDate: Date;
      let endDate: Date;

      if (range === 'monthly') {
        const { year, month } = validatePeriod(period, 'monthly');
        if (!month) throw new Error(`Invalid monthly period: ${period}`);
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0, 23, 59, 59);
      } else {
        const { year } = validatePeriod(period, 'yearly');
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59);
      }

      const [totalIncome, totalExpenses, trendData, incomeCategories, expenseCategories] =
        await Promise.all([
          this.getTotalIncome(workspaceId, startDate, endDate, currency, userId),
          this.getTotalExpenses(workspaceId, startDate, endDate, currency, userId),
          this.getOverviewTrendData(workspaceId, startDate, endDate, range, currency, userId),
          this.getIncomeByCategory(workspaceId, startDate, endDate, currency, userId),
          this.getExpenseByCategory(workspaceId, startDate, endDate, currency, userId),
        ]);

      const netSavings = decimalSubtract(totalIncome, totalExpenses);
      const savingsRate = decimalIsZero(totalIncome)
        ? '0'
        : decimalDivide(decimalMultiply(netSavings, '100'), totalIncome);

      return {
        totalIncome,
        totalExpenses,
        netSavings,
        savingsRate,
        trendData,
        incomePreview: {
          topCategories: incomeCategories,
          total: totalIncome,
        },
        expensePreview: {
          topCategories: expenseCategories,
          total: totalExpenses,
        },
      };
    } catch (error) {
      log.error('error getting overview report:', error);
      return {
        totalIncome: '0',
        totalExpenses: '0',
        netSavings: '0',
        savingsRate: '0',
        trendData: [],
        incomePreview: { topCategories: [], total: '0' },
        expensePreview: { topCategories: [], total: '0' },
      };
    }
  }

  /**
   * Get expense report — wraps existing expense detail with recurring + member data
   */
  async getExpenseReport(
    workspaceId: string,
    period: string,
    range: 'monthly' | 'yearly',
    currency: Currency = 'IDR',
    userId?: string
  ): Promise<ExpenseReportData> {
    try {
      this.validateWorkspaceId(workspaceId);
      this.validateCurrency(currency);

      const baseReport =
        range === 'monthly'
          ? await this.getMonthlyReport(workspaceId, period, currency, userId)
          : await this.getYearlyReport(
              workspaceId,
              validatePeriod(period, 'yearly').year,
              currency,
              userId
            );

      let recurringBreakdown: RecurringBreakdown | null = null;
      if (range === 'monthly') {
        try {
          const { year, month } = validatePeriod(period, 'monthly');
          if (month) {
            recurringBreakdown = await this.getRecurringBreakdown(
              workspaceId,
              year,
              month,
              currency
            );
          }
        } catch {
          // recurring breakdown is optional
        }
      }

      const memberSummary = await this.getMemberSummary(workspaceId, period, range, currency);

      return {
        ...baseReport,
        recurringBreakdown,
        memberSummary,
      };
    } catch (error) {
      log.error('error getting expense report:', error);
      return {
        ...this.getEmptyReport(),
        recurringBreakdown: null,
        memberSummary: [],
      };
    }
  }

  /**
   * Get income report — aggregated income analysis with source grouping
   */
  async getIncomeReport(
    workspaceId: string,
    period: string,
    range: 'monthly' | 'yearly',
    currency: Currency = 'IDR',
    filters: IncomeReportFilters = {}
  ): Promise<IncomeReportData> {
    try {
      this.validateWorkspaceId(workspaceId);
      this.validateCurrency(currency);

      let startDate: Date;
      let endDate: Date;
      let prevStartDate: Date;
      let prevEndDate: Date;

      if (range === 'monthly') {
        const { year, month } = validatePeriod(period, 'monthly');
        if (!month) throw new Error(`Invalid monthly period: ${period}`);
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0, 23, 59, 59);
        prevStartDate = new Date(year, month - 2, 1);
        prevEndDate = new Date(year, month - 1, 0, 23, 59, 59);
      } else {
        const { year } = validatePeriod(period, 'yearly');
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59);
        prevStartDate = new Date(year - 1, 0, 1);
        prevEndDate = new Date(year - 1, 11, 31, 23, 59, 59);
      }

      const [
        totalIncome,
        prevTotalIncome,
        sourceGroup,
        sourceMix,
        sourceGroupTrend,
        members,
        history,
      ] = await Promise.all([
        this.getTotalIncome(workspaceId, startDate, endDate, currency, filters.userId),
        this.getTotalIncome(workspaceId, prevStartDate, prevEndDate, currency, filters.userId),
        this.getIncomeBySourceGroup(workspaceId, startDate, endDate, currency, filters.userId),
        this.getIncomeByCategory(workspaceId, startDate, endDate, currency, filters.userId),
        this.getIncomeSourceTrendData(workspaceId, startDate, endDate, currency, filters.userId),
        this.getMemberIncomeSummary(workspaceId, startDate, endDate, currency),
        this.getIncomeHistory(workspaceId, startDate, endDate, currency, filters),
      ]);

      const growthVsPreviousPeriod = decimalIsZero(prevTotalIncome)
        ? decimalIsZero(totalIncome)
          ? '0'
          : '100'
        : decimalDivide(
            decimalMultiply(decimalSubtract(totalIncome, prevTotalIncome), '100'),
            prevTotalIncome
          );
      const previousPeriodLabel =
        range === 'monthly'
          ? prevStartDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : String(prevStartDate.getFullYear());

      return {
        summary: {
          totalIncome,
          activeIncome: sourceGroup.active,
          passiveIncome: sourceGroup.passive,
          otherIncome: sourceGroup.other,
          growthVsPreviousPeriod,
          previousPeriodLabel,
        },
        sourceMix,
        sourceGroupTrend,
        members,
        history,
      };
    } catch (error) {
      log.error('error getting income report:', error);
      return {
        summary: {
          totalIncome: '0',
          activeIncome: '0',
          passiveIncome: '0',
          otherIncome: '0',
          growthVsPreviousPeriod: '0',
          previousPeriodLabel: '',
        },
        sourceMix: [],
        sourceGroupTrend: [],
        members: [],
        history: {
          transactions: [],
          total: 0,
          page: 1,
          pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
          appliedFilters: {},
        },
      };
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
    currency: Currency,
    userId?: string
  ): Promise<string> {
    const [result] = await (this.db as any)
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${this.schema.transactions.amount} AS NUMERIC)), 0)`,
      })
      .from(this.schema.transactions)
      .where(
        and(
          eq(this.schema.transactions.workspace_id, workspaceId),
          eq(this.schema.transactions.type, 'income'),
          eq(this.schema.transactions.currency, currency),
          gte(this.schema.transactions.transaction_date, startDate),
          lte(this.schema.transactions.transaction_date, endDate),
          sql`${this.schema.transactions.deleted_at} IS NULL`,
          ...(userId ? [eq(this.schema.transactions.created_by_user_id, userId)] : [])
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
    currency: Currency,
    userId?: string
  ): Promise<string> {
    const [result] = await (this.db as any)
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${this.schema.transactions.amount} AS NUMERIC)), 0)`,
      })
      .from(this.schema.transactions)
      .where(
        and(
          eq(this.schema.transactions.workspace_id, workspaceId),
          eq(this.schema.transactions.type, 'expense'),
          eq(this.schema.transactions.currency, currency),
          gte(this.schema.transactions.transaction_date, startDate),
          lte(this.schema.transactions.transaction_date, endDate),
          sql`${this.schema.transactions.deleted_at} IS NULL`,
          ...(userId ? [eq(this.schema.transactions.created_by_user_id, userId)] : [])
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
    currency: Currency,
    userId?: string
  ): Promise<number> {
    // Get total budget for the month
    const [budgetResult] = await (this.db as any)
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${this.schema.budgets.budget_amount} AS NUMERIC)), 0)`,
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
    const totalExpenses = await this.getTotalExpenses(
      workspaceId,
      startDate,
      endDate,
      currency,
      userId
    );

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
    currency: Currency,
    userId?: string
  ): Promise<number> {
    // Get total budget for all months in the year
    const [budgetResult] = await (this.db as any)
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${this.schema.budgets.budget_amount} AS NUMERIC)), 0)`,
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
    const totalExpenses = await this.getTotalExpenses(
      workspaceId,
      startDate,
      endDate,
      currency,
      userId
    );

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
    currency: Currency,
    userId?: string
  ): Promise<CategoryExpense[]> {
    const categoryExpenses = await (this.db as any)
      .select({
        category_name: this.schema.categories.name,
        total: sql<string>`COALESCE(SUM(CAST(${this.schema.transactions.amount} AS NUMERIC)), 0)`,
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
          sql`${this.schema.transactions.deleted_at} IS NULL`,
          ...(userId ? [eq(this.schema.transactions.created_by_user_id, userId)] : [])
        )
      )
      .groupBy(this.schema.categories.name)
      .orderBy(sql`SUM(CAST(${this.schema.transactions.amount} AS NUMERIC)) DESC`);

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
    currency: Currency,
    userId?: string
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
        total: sql<string>`COALESCE(SUM(CAST(${this.schema.transactions.amount} AS NUMERIC)), 0)`,
      })
      .from(this.schema.transactions)
      .where(
        and(
          eq(this.schema.transactions.workspace_id, workspaceId),
          eq(this.schema.transactions.type, 'expense'),
          eq(this.schema.transactions.currency, currency),
          gte(this.schema.transactions.transaction_date, startDate),
          lte(this.schema.transactions.transaction_date, endDate),
          sql`${this.schema.transactions.deleted_at} IS NULL`,
          ...(userId ? [eq(this.schema.transactions.created_by_user_id, userId)] : [])
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
    currency: Currency,
    userId?: string
  ): Promise<CategoryIntelligence[]> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // Get all budgets for the year with category info (summed)
    const yearlyBudgets = await (this.db as any)
      .select({
        category_id: this.schema.budgets.category_id,
        total_budget: sql<string>`COALESCE(SUM(CAST(${this.schema.budgets.budget_amount} AS NUMERIC)), 0)`,
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
        total: sql<string>`COALESCE(SUM(CAST(${this.schema.transactions.amount} AS NUMERIC)), 0)`,
      })
      .from(this.schema.transactions)
      .where(
        and(
          eq(this.schema.transactions.workspace_id, workspaceId),
          eq(this.schema.transactions.type, 'expense'),
          eq(this.schema.transactions.currency, currency),
          gte(this.schema.transactions.transaction_date, startDate),
          lte(this.schema.transactions.transaction_date, endDate),
          sql`${this.schema.transactions.deleted_at} IS NULL`,
          ...(userId ? [eq(this.schema.transactions.created_by_user_id, userId)] : [])
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

  private monthBucket(column: any) {
    const { dialect } = getDatabaseConfig();
    return dialect === 'postgresql'
      ? sql<string>`to_char(${column}, 'YYYY-MM')`
      : sql<string>`strftime('%Y-%m', ${column}, 'unixepoch')`;
  }

  private toMonthKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private async getTrendAggregateByMonth(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    currency: Currency,
    userId?: string
  ): Promise<Map<string, { income: string; expenses: string }>> {
    const monthBucketExpr = this.monthBucket(this.schema.transactions.transaction_date);

    const rows = await (this.db as any)
      .select({
        month_bucket: monthBucketExpr.as('month_bucket'),
        income: sql<string>`COALESCE(SUM(CASE WHEN ${this.schema.transactions.type} = 'income' THEN CAST(${this.schema.transactions.amount} AS NUMERIC) ELSE 0 END), 0)`,
        expenses: sql<string>`COALESCE(SUM(CASE WHEN ${this.schema.transactions.type} = 'expense' THEN CAST(${this.schema.transactions.amount} AS NUMERIC) ELSE 0 END), 0)`,
      })
      .from(this.schema.transactions)
      .where(
        and(
          eq(this.schema.transactions.workspace_id, workspaceId),
          eq(this.schema.transactions.currency, currency),
          gte(this.schema.transactions.transaction_date, startDate),
          lte(this.schema.transactions.transaction_date, endDate),
          sql`${this.schema.transactions.deleted_at} IS NULL`,
          ...(userId ? [eq(this.schema.transactions.created_by_user_id, userId)] : [])
        )
      )
      .groupBy(monthBucketExpr);

    const map = new Map<string, { income: string; expenses: string }>();
    for (const row of rows as Array<{ month_bucket: string; income: string; expenses: string }>) {
      map.set(row.month_bucket, {
        income: row.income?.toString() || '0',
        expenses: row.expenses?.toString() || '0',
      });
    }

    return map;
  }

  private async getTransactionIdsWithHistory(
    workspaceId: string,
    transactionIds: string[]
  ): Promise<Set<string>> {
    const results = await (this.db as any)
      .select({ entity_id: this.schema.auditLogs.entity_id })
      .from(this.schema.auditLogs)
      .where(
        and(
          eq(this.schema.auditLogs.entity_type, 'transaction'),
          eq(this.schema.auditLogs.workspace_id, workspaceId),
          inArray(this.schema.auditLogs.entity_id, transactionIds),
          inArray(this.schema.auditLogs.action, ['update', 'delete'])
        )
      )
      .groupBy(this.schema.auditLogs.entity_id);

    return new Set(results.map((row: { entity_id: string }) => row.entity_id));
  }

  /**
   * Get trend data for trailing periods (monthly view shows 3 months)
   * @private
   */
  private async getTrendData(
    workspaceId: string,
    year: number,
    month: number,
    currency: Currency,
    trailingMonths: number,
    userId?: string
  ): Promise<TrendDataPoint[]> {
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const startDate = new Date(year, month - trailingMonths, 1);
    const aggregateMap = await this.getTrendAggregateByMonth(
      workspaceId,
      startDate,
      endDate,
      currency,
      userId
    );

    const trendData: TrendDataPoint[] = [];
    for (let i = trailingMonths - 1; i >= 0; i--) {
      const date = new Date(year, month - 1 - i, 1);
      const monthKey = this.toMonthKey(date);
      const row = aggregateMap.get(monthKey);

      trendData.push({
        name: MONTH_NAMES_SHORT[date.getMonth()],
        income: row?.income || '0',
        expenses: row?.expenses || '0',
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
    currency: Currency,
    userId?: string
  ): Promise<TrendDataPoint[]> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);
    const aggregateMap = await this.getTrendAggregateByMonth(
      workspaceId,
      startDate,
      endDate,
      currency,
      userId
    );

    const trendData: TrendDataPoint[] = [];
    for (let month = 1; month <= 12; month++) {
      const date = new Date(year, month - 1, 1);
      const monthKey = this.toMonthKey(date);
      const row = aggregateMap.get(monthKey);

      trendData.push({
        name: MONTH_NAMES_SHORT[month - 1],
        income: row?.income || '0',
        expenses: row?.expenses || '0',
      });
    }

    return trendData;
  }

  private async getOverviewTrendData(
    workspaceId: string,
    startDate: Date,
    _endDate: Date,
    range: 'monthly' | 'yearly',
    currency: Currency,
    userId?: string
  ): Promise<TrendDataPoint[]> {
    if (range === 'monthly') {
      const { year, month } = { year: startDate.getFullYear(), month: startDate.getMonth() + 1 };
      return this.getTrendData(workspaceId, year, month, currency, 3, userId);
    }
    const year = startDate.getFullYear();
    return this.getYearlyTrendData(workspaceId, year, currency, userId);
  }

  private async getIncomeBySourceGroup(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    currency: Currency,
    userId?: string
  ): Promise<{ active: string; passive: string; other: string }> {
    const rows = await (this.db as any)
      .select({
        source_type: sql<string>`COALESCE(${this.schema.categories.income_source_type}, 'other')`,
        total: sql<string>`COALESCE(SUM(CAST(${this.schema.transactions.amount} AS NUMERIC)), 0)`,
      })
      .from(this.schema.transactions)
      .innerJoin(
        this.schema.categories,
        eq(this.schema.transactions.category_id, this.schema.categories.id)
      )
      .where(
        and(
          eq(this.schema.transactions.workspace_id, workspaceId),
          eq(this.schema.transactions.type, 'income'),
          eq(this.schema.transactions.currency, currency),
          gte(this.schema.transactions.transaction_date, startDate),
          lte(this.schema.transactions.transaction_date, endDate),
          sql`${this.schema.transactions.deleted_at} IS NULL`,
          ...(userId ? [eq(this.schema.transactions.created_by_user_id, userId)] : [])
        )
      )
      .groupBy(this.schema.categories.income_source_type);

    const result = { active: '0', passive: '0', other: '0' };
    for (const row of rows as Array<{ source_type: string; total: string }>) {
      const key = row.source_type as keyof typeof result;
      if (key in result) {
        result[key] = row.total?.toString() || '0';
      }
    }
    return result;
  }

  private async getIncomeByCategory(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    currency: Currency,
    userId?: string
  ): Promise<IncomeCategoryExpense[]> {
    const categoryIncome = await (this.db as any)
      .select({
        category_name: this.schema.categories.name,
        source_type: sql<string>`COALESCE(${this.schema.categories.income_source_type}, 'other')`,
        total: sql<string>`COALESCE(SUM(CAST(${this.schema.transactions.amount} AS NUMERIC)), 0)`,
      })
      .from(this.schema.transactions)
      .innerJoin(
        this.schema.categories,
        eq(this.schema.transactions.category_id, this.schema.categories.id)
      )
      .where(
        and(
          eq(this.schema.transactions.workspace_id, workspaceId),
          eq(this.schema.transactions.type, 'income'),
          eq(this.schema.transactions.currency, currency),
          gte(this.schema.transactions.transaction_date, startDate),
          lte(this.schema.transactions.transaction_date, endDate),
          sql`${this.schema.transactions.deleted_at} IS NULL`,
          ...(userId ? [eq(this.schema.transactions.created_by_user_id, userId)] : [])
        )
      )
      .groupBy(this.schema.categories.name, this.schema.categories.income_source_type)
      .orderBy(sql`SUM(CAST(${this.schema.transactions.amount} AS NUMERIC)) DESC`);

    if (categoryIncome.length === 0) {
      return [];
    }

    return categoryIncome.map((cat: any) => ({
      name: cat.category_name,
      value: cat.total?.toString() || '0',
      sourceType: (['active', 'passive', 'other'].includes(cat.source_type)
        ? cat.source_type
        : 'other') as 'active' | 'passive' | 'other',
    }));
  }

  private async getIncomeSourceTrendData(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    currency: Currency,
    userId?: string
  ): Promise<Array<{ name: string; active: string; passive: string; other: string }>> {
    const monthBucketExpr = this.monthBucket(this.schema.transactions.transaction_date);

    const rows = await (this.db as any)
      .select({
        month_bucket: monthBucketExpr.as('month_bucket'),
        active: sql<string>`COALESCE(SUM(CASE WHEN COALESCE(${this.schema.categories.income_source_type}, 'other') = 'active' THEN CAST(${this.schema.transactions.amount} AS NUMERIC) ELSE 0 END), 0)`,
        passive: sql<string>`COALESCE(SUM(CASE WHEN COALESCE(${this.schema.categories.income_source_type}, 'other') = 'passive' THEN CAST(${this.schema.transactions.amount} AS NUMERIC) ELSE 0 END), 0)`,
        other: sql<string>`COALESCE(SUM(CASE WHEN COALESCE(${this.schema.categories.income_source_type}, 'other') = 'other' THEN CAST(${this.schema.transactions.amount} AS NUMERIC) ELSE 0 END), 0)`,
      })
      .from(this.schema.transactions)
      .innerJoin(
        this.schema.categories,
        eq(this.schema.transactions.category_id, this.schema.categories.id)
      )
      .where(
        and(
          eq(this.schema.transactions.workspace_id, workspaceId),
          eq(this.schema.transactions.type, 'income'),
          eq(this.schema.transactions.currency, currency),
          gte(this.schema.transactions.transaction_date, startDate),
          lte(this.schema.transactions.transaction_date, endDate),
          sql`${this.schema.transactions.deleted_at} IS NULL`,
          ...(userId ? [eq(this.schema.transactions.created_by_user_id, userId)] : [])
        )
      )
      .groupBy(monthBucketExpr);

    const dataMap = new Map<string, { active: string; passive: string; other: string }>();
    for (const row of rows as Array<{
      month_bucket: string;
      active: string;
      passive: string;
      other: string;
    }>) {
      dataMap.set(row.month_bucket, {
        active: row.active?.toString() || '0',
        passive: row.passive?.toString() || '0',
        other: row.other?.toString() || '0',
      });
    }

    // Build full month range
    const result: Array<{ name: string; active: string; passive: string; other: string }> = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const monthKey = this.toMonthKey(current);
      const data = dataMap.get(monthKey);
      result.push({
        name: MONTH_NAMES_SHORT[current.getMonth()],
        active: data?.active || '0',
        passive: data?.passive || '0',
        other: data?.other || '0',
      });
      current.setMonth(current.getMonth() + 1);
    }

    return result;
  }

  private async getIncomeHistory(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    currency: Currency,
    filters: IncomeReportFilters
  ): Promise<IncomeHistoryData> {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(
      PAGINATION.MAX_PAGE_SIZE,
      Math.max(1, filters.pageSize || PAGINATION.DEFAULT_PAGE_SIZE)
    );
    const offset = (page - 1) * pageSize;

    const conditions = [
      eq(this.schema.transactions.workspace_id, workspaceId),
      eq(this.schema.transactions.type, 'income'),
      eq(this.schema.transactions.currency, currency),
      gte(this.schema.transactions.transaction_date, startDate),
      lte(this.schema.transactions.transaction_date, endDate),
      sql`${this.schema.transactions.deleted_at} IS NULL`,
    ];

    if (filters.userId) {
      conditions.push(eq(this.schema.transactions.created_by_user_id, filters.userId));
    }
    if (filters.sourceType) {
      conditions.push(eq(this.schema.categories.income_source_type, filters.sourceType));
    }
    if (filters.categoryId) {
      conditions.push(eq(this.schema.transactions.category_id, filters.categoryId));
    }

    const [countResult, rows] = await Promise.all([
      (this.db as any)
        .select({ count: sql<number>`count(*)` })
        .from(this.schema.transactions)
        .innerJoin(
          this.schema.categories,
          eq(this.schema.transactions.category_id, this.schema.categories.id)
        )
        .where(and(...conditions)),
      (this.db as any)
        .select({
          id: this.schema.transactions.id,
          description: this.schema.transactions.description,
          amount: this.schema.transactions.amount,
          currency: this.schema.transactions.currency,
          transaction_date: this.schema.transactions.transaction_date,
          category_name: this.schema.categories.name,
          category_icon: this.schema.categories.icon,
          category_color: this.schema.categories.color,
          income_source_type: sql<string>`COALESCE(${this.schema.categories.income_source_type}, 'other')`,
          created_by_name: sql<string>`COALESCE(${this.schema.users.name}, ${this.schema.users.email})`,
        })
        .from(this.schema.transactions)
        .innerJoin(
          this.schema.categories,
          eq(this.schema.transactions.category_id, this.schema.categories.id)
        )
        .innerJoin(
          this.schema.users,
          eq(this.schema.transactions.created_by_user_id, this.schema.users.id)
        )
        .where(and(...conditions))
        .orderBy(sql`${this.schema.transactions.transaction_date} DESC`)
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    const appliedFilters: IncomeHistoryData['appliedFilters'] = {};
    if (filters.userId) appliedFilters.userId = filters.userId;
    if (filters.sourceType) appliedFilters.sourceType = filters.sourceType;
    if (filters.categoryId) appliedFilters.categoryId = filters.categoryId;

    return {
      transactions: (rows as any[]).map((row) => ({
        id: row.id,
        description: row.description || '',
        amount: row.amount?.toString() || '0',
        currency: row.currency,
        transaction_date:
          row.transaction_date instanceof Date
            ? row.transaction_date.toISOString()
            : String(row.transaction_date),
        category_name: row.category_name || 'Unknown',
        category_icon: row.category_icon || 'tag',
        category_color: row.category_color || 'bg-neutral',
        income_source_type: row.income_source_type || 'other',
        created_by_name: row.created_by_name || 'Unknown',
      })),
      total,
      page,
      pageSize,
      appliedFilters,
    };
  }

  private async getMemberIncomeSummary(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    currency: Currency
  ): Promise<
    Array<{ userId: string; userName: string; totalIncome: string; transactionCount: number }>
  > {
    const incomeByUser = await (this.db as any)
      .select({
        user_id: this.schema.transactions.created_by_user_id,
        total: sql<string>`COALESCE(SUM(CAST(${this.schema.transactions.amount} AS NUMERIC)), 0)`,
        count: sql<number>`COUNT(*)`,
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
      )
      .groupBy(this.schema.transactions.created_by_user_id);

    if (incomeByUser.length === 0) return [];

    const members = await this.db.query.users.findMany({
      where: and(
        eq(this.schema.users.workspace_id, workspaceId),
        sql`${this.schema.users.deleted_at} IS NULL`
      ),
    });

    const memberMap = new Map(
      members.map((member: any) => [member.id, member.name || member.email])
    );

    return (incomeByUser as any[])
      .map((row) => ({
        userId: row.user_id,
        userName: memberMap.get(row.user_id) || 'Unknown',
        totalIncome: row.total?.toString() || '0',
        transactionCount: Number(row.count) || 0,
      }))
      .sort((a, b) => parseFloat(b.totalIncome) - parseFloat(a.totalIncome));
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
