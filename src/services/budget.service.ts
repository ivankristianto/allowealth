import { db, transactions, categories } from '@/db';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import {
  decimalAdd,
  decimalSubtract,
  decimalDivide,
  decimalMultiply,
  decimalCompare,
  decimalSum,
  decimalIsZero,
} from '@/lib/utils/decimal';

export interface BudgetOverview {
  category_id: string;
  category_name: string;
  category_type: 'expense' | 'income';
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
  /**
   * Get budget overview for a specific month
   */
  async getMonthlyOverview(
    user_id: string,
    year: number,
    month: number,
    currency: 'IDR' | 'USD'
  ): Promise<BudgetSummary> {
    // Validate inputs
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new Error('Invalid year parameter');
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error('Invalid month parameter');
    }

    // Get start and end of month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get all expense categories for user with given currency
    const userCategories = await db.query.categories.findMany({
      where: and(
        eq(categories.user_id, user_id),
        eq(categories.type, 'expense'),
        eq(categories.currency, currency),
        eq(categories.is_active, true)
      ),
    });

    // Get transactions for the month grouped by category
    const monthTransactions = await (db as any)
      .select({
        category_id: transactions.category_id,
        total: sql<string>`sum(CAST(${transactions.amount} AS REAL))`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.user_id, user_id),
          eq(transactions.type, 'expense'),
          eq(transactions.currency, currency),
          gte(transactions.transaction_date, startDate),
          lte(transactions.transaction_date, endDate),
          sql`${transactions.deleted_at} IS NULL`
        )
      )
      .groupBy(transactions.category_id);

    // Create a map of spent amounts by category
    const spentByCategory = new Map<string, string>();
    for (const tx of monthTransactions) {
      spentByCategory.set(tx.category_id, tx.total || '0');
    }

    // Calculate budget overview for each category
    const categoryOverviews: BudgetOverview[] = userCategories.map((category) => {
      const budgetAmount = category.budget_amount;
      const spentAmount = spentByCategory.get(category.id) || '0';
      const balance = decimalSubtract(budgetAmount, spentAmount);
      const percentageUsed = !decimalIsZero(budgetAmount)
        ? parseFloat(decimalDivide(decimalMultiply(spentAmount, 100), budgetAmount))
        : 0;

      let status: 'ok' | 'warning' | 'exceeded' = 'ok';
      if (percentageUsed >= 100) {
        status = 'exceeded';
      } else if (percentageUsed >= 80) {
        status = 'warning';
      }

      return {
        category_id: category.id,
        category_name: category.name,
        category_type: category.type,
        percentage: category.percentage,
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
    user_id: string,
    currency: 'IDR' | 'USD',
    months: number = 12
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

      const overview = await this.getMonthlyOverview(user_id, year, month, currency);

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
  async getAlerts(user_id: string, currency: 'IDR' | 'USD') {
    const now = new Date();
    const overview = await this.getMonthlyOverview(
      user_id,
      now.getFullYear(),
      now.getMonth() + 1,
      currency
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
   */
  async getCategoryRemaining(category_id: string, user_id: string) {
    const category = await db.query.categories.findFirst({
      where: and(eq(categories.id, category_id), eq(categories.user_id, user_id)),
    });

    if (!category) {
      throw new Error('Category not found');
    }

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [result] = await (db as any)
      .select({
        total: sql<string>`COALESCE(sum(CAST(${transactions.amount} AS REAL)), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.user_id, user_id),
          eq(transactions.category_id, category_id),
          eq(transactions.type, 'expense'),
          gte(transactions.transaction_date, startDate),
          lte(transactions.transaction_date, endDate),
          sql`${transactions.deleted_at} IS NULL`
        )
      );

    const budgetAmount = category.budget_amount;
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
}

export const budgetService = new BudgetService();
