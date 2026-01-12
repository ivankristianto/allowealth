/**
 * Dashboard Service
 * =================
 * Provides aggregated data for the dashboard including:
 * - Total assets by currency
 * - Monthly spending summary
 * - Budget health alerts
 * - Asset update reminders
 * - Recent transactions
 */

import { db, assets, transactions, categories, exchangeRates } from '@/db';
import { eq, and, gte, lte, desc, sql, sum } from 'drizzle-orm';
import {
  convertCurrency,
  convertCurrencySync,
  getLatestExchangeRate,
} from '@/lib/currency/conversion';
import { calculateBudgetAlert, calculateBudgetStatus } from '@/lib/budget/alerts';
import { calculateAssetPriority } from '@/lib/assets/priority';
import {
  decimalAdd,
  decimalSubtract,
  decimalDivide,
  decimalMultiply,
  decimalCompare,
  decimalSum,
  decimalIsZero,
} from '@/lib/utils/decimal';

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
 * Dashboard data aggregation service
 */
export class DashboardService {
  /**
   * Get total assets summed by currency
   *
   * @param userId - User ID
   * @param primaryCurrency - Primary currency for converted total (default: IDR)
   * @returns Total assets by currency
   */
  async getTotalAssets(
    userId: string,
    primaryCurrency: 'IDR' | 'USD' = 'IDR'
  ): Promise<TotalAssets> {
    try {
      // Get all non-deleted assets for user
      const userAssets = await db.query.assets.findMany({
        where: and(eq(assets.user_id, userId), sql`${assets.deleted_at} IS NULL`),
      });

      // Sum by currency using decimal arithmetic
      const idrBalances = userAssets.filter((a) => a.currency === 'IDR').map((a) => a.balance);
      const usdBalances = userAssets.filter((a) => a.currency === 'USD').map((a) => a.balance);

      const idrTotal = decimalSum(idrBalances);
      const usdTotal = decimalSum(usdBalances);

      // Get exchange rate for conversion
      const rate = await getLatestExchangeRate();
      const rateString = rate.toString();

      // Convert to primary currency
      let convertedTotal: string;
      if (primaryCurrency === 'IDR') {
        // Convert USD to IDR and add to IDR total
        const usdConverted = decimalMultiply(usdTotal, rateString);
        convertedTotal = decimalAdd(idrTotal, usdConverted);
      } else {
        // Convert IDR to USD and add to USD total
        const idrConverted = decimalDivide(idrTotal, rateString);
        convertedTotal = decimalAdd(usdTotal, idrConverted);
      }

      return {
        idr: idrTotal,
        usd: usdTotal,
        converted: convertedTotal,
        convertedCurrency: primaryCurrency,
      };
    } catch (error) {
      console.error('Error getting total assets:', error);
      // Return zeroed values on error
      return {
        idr: '0',
        usd: '0',
        converted: '0',
        convertedCurrency: primaryCurrency,
      };
    }
  }

  /**
   * Get total spending for a specific month
   *
   * @param userId - User ID
   * @param month - Month (1-12)
   * @param year - Year
   * @param currency - Currency to aggregate (default: IDR)
   * @returns Monthly spending summary
   */
  async getMonthlySpent(
    userId: string,
    month: number,
    year: number,
    currency: 'IDR' | 'USD' = 'IDR'
  ): Promise<MonthlySpent> {
    try {
      // Validate inputs
      if (month < 1 || month > 12) {
        throw new Error(`Invalid month: ${month}. Must be between 1 and 12.`);
      }
      if (year < 2000 || year > 2100) {
        throw new Error(`Invalid year: ${year}. Must be between 2000 and 2100.`);
      }

      // Calculate date range for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Get total budget for the month (sum of all expense category budgets)
      const [budgetResult] = await (db as any)
        .select({
          total: sql<string>`COALESCE(SUM(CAST(${categories.budget_amount} AS REAL)), 0)`,
        })
        .from(categories)
        .where(
          and(
            eq(categories.user_id, userId),
            eq(categories.type, 'expense'),
            eq(categories.currency, currency),
            eq(categories.is_active, true)
          )
        );

      const totalBudget = budgetResult?.total || '0';

      // Get total spent for the month
      const [spentResult] = await (db as any)
        .select({
          total: sql<string>`COALESCE(SUM(CAST(${transactions.amount} AS REAL)), 0)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.user_id, userId),
            eq(transactions.type, 'expense'),
            eq(transactions.currency, currency),
            gte(transactions.transaction_date, startDate),
            lte(transactions.transaction_date, endDate),
            sql`${transactions.deleted_at} IS NULL`
          )
        );

      const totalSpent = spentResult?.total || '0';

      // Calculate percentage and remaining using decimal arithmetic
      const percentage = !decimalIsZero(totalBudget)
        ? parseFloat(decimalDivide(decimalMultiply(totalSpent, 100), totalBudget))
        : 0;
      const remaining = decimalSubtract(totalBudget, totalSpent);

      return {
        total: totalSpent,
        budget: totalBudget,
        percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
        remaining,
      };
    } catch (error) {
      console.error('Error getting monthly spent:', error);
      // Return zeroed values on error
      return {
        total: '0',
        budget: '0',
        percentage: 0,
        remaining: '0',
      };
    }
  }

  /**
   * Get budget health with alerts for a specific month
   *
   * @param userId - User ID
   * @param month - Month (1-12)
   * @param year - Year
   * @param currency - Currency to check (default: IDR)
   * @returns Budget health with alerts
   */
  async getBudgetHealth(
    userId: string,
    month: number,
    year: number,
    currency: 'IDR' | 'USD' = 'IDR'
  ): Promise<BudgetHealth> {
    try {
      // Validate inputs
      if (month < 1 || month > 12) {
        throw new Error(`Invalid month: ${month}. Must be between 1 and 12.`);
      }
      if (year < 2000 || year > 2100) {
        throw new Error(`Invalid year: ${year}. Must be between 2000 and 2100.`);
      }

      // Calculate date range for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Get all expense categories for user
      const userCategories = await db.query.categories.findMany({
        where: and(
          eq(categories.user_id, userId),
          eq(categories.type, 'expense'),
          eq(categories.currency, currency),
          eq(categories.is_active, true)
        ),
      });

      // Get total spent per category for the month
      const categorySpending = await (db as any)
        .select({
          category_id: transactions.category_id,
          total: sql<string>`COALESCE(SUM(CAST(${transactions.amount} AS REAL)), 0)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.user_id, userId),
            eq(transactions.type, 'expense'),
            eq(transactions.currency, currency),
            gte(transactions.transaction_date, startDate),
            lte(transactions.transaction_date, endDate),
            sql`${transactions.deleted_at} IS NULL`
          )
        )
        .groupBy(transactions.category_id);

      // Create map of spending by category
      const spendingByCategory = new Map<string, string>();
      for (const spending of categorySpending) {
        spendingByCategory.set(spending.category_id, spending.total);
      }

      // Calculate alerts for each category
      const alerts: BudgetAlert[] = [];

      for (const category of userCategories) {
        const budget = category.budget_amount;
        const spent = spendingByCategory.get(category.id) || '0';

        const alert = calculateBudgetAlert(category.name, budget, spent);
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
      console.error('Error getting budget health:', error);
      // Return empty result on error
      return {
        alertCount: 0,
        status: 'healthy',
        alerts: [],
      };
    }
  }

  /**
   * Get assets that need updating (older than 7 days)
   *
   * @param userId - User ID
   * @returns Array of asset reminders
   */
  async getAssetUpdateReminders(userId: string): Promise<AssetReminder[]> {
    try {
      // Get all non-deleted assets
      const userAssets = await db.query.assets.findMany({
        where: and(eq(assets.user_id, userId), sql`${assets.deleted_at} IS NULL`),
      });

      // Calculate priority for each asset
      const reminders: AssetReminder[] = [];

      for (const asset of userAssets) {
        const priorityResult = calculateAssetPriority(asset.last_updated);

        // Only include assets that need update (>7 days)
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

      // Sort by priority (high to low) then by days since update (descending)
      const priorityValue = { high: 3, medium: 2, low: 1 };
      reminders.sort((a, b) => {
        const priorityDiff = priorityValue[b.priority] - priorityValue[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.daysSinceUpdate - a.daysSinceUpdate;
      });

      return reminders;
    } catch (error) {
      console.error('Error getting asset update reminders:', error);
      // Return empty array on error
      return [];
    }
  }

  /**
   * Get recent transactions for the user
   *
   * @param userId - User ID
   * @param limit - Maximum number of transactions to return (default: 5)
   * @returns Array of recent transactions
   */
  async getRecentTransactions(
    userId: string,
    limit: number = 5
  ): Promise<
    Array<{
      id: string;
      type: 'expense' | 'income';
      amount: string;
      currency: 'IDR' | 'USD';
      description: string | null;
      transactionDate: Date;
      category: {
        id: string;
        name: string;
        type: 'expense' | 'income';
      };
      paymentMethod: {
        id: string;
        name: string;
      };
    }>
  > {
    try {
      // Validate limit
      if (limit < 1 || limit > 100) {
        throw new Error(`Invalid limit: ${limit}. Must be between 1 and 100.`);
      }

      // Get recent transactions
      const recentTransactions = await db.query.transactions.findMany({
        where: and(eq(transactions.user_id, userId), sql`${transactions.deleted_at} IS NULL`),
        with: {
          category: true,
          paymentMethod: true,
        },
        orderBy: [desc(transactions.transaction_date), desc(transactions.created_at)],
        limit,
      });

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
        },
        paymentMethod: {
          id: tx.paymentMethod.id,
          name: tx.paymentMethod.name,
        },
      }));
    } catch (error) {
      console.error('Error getting recent transactions:', error);
      // Return empty array on error
      return [];
    }
  }

  /**
   * Get complete dashboard data for a user
   *
   * @param userId - User ID
   * @param month - Month (1-12, default: current month)
   * @param year - Year (default: current year)
   * @param currency - Primary currency (default: IDR)
   * @returns Complete dashboard data
   */
  async getDashboardData(
    userId: string,
    month?: number,
    year?: number,
    currency: 'IDR' | 'USD' = 'IDR'
  ) {
    const now = new Date();
    const currentMonth = month ?? now.getMonth() + 1;
    const currentYear = year ?? now.getFullYear();

    // Get all dashboard data in parallel
    const [totalAssets, monthlySpent, budgetHealth, assetReminders, recentTransactions] =
      await Promise.all([
        this.getTotalAssets(userId, currency),
        this.getMonthlySpent(userId, currentMonth, currentYear, currency),
        this.getBudgetHealth(userId, currentMonth, currentYear, currency),
        this.getAssetUpdateReminders(userId),
        this.getRecentTransactions(userId, 5),
      ]);

    return {
      totalAssets,
      monthlySpent,
      budgetHealth,
      assetReminders,
      recentTransactions,
    };
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();
