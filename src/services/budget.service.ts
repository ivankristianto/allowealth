import { db, transactions, categories } from '@/db';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

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
    const monthTransactions = await db
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
      const budgetAmount = parseFloat(category.budget_amount);
      const spentAmount = parseFloat(spentByCategory.get(category.id) || '0');
      const balance = budgetAmount - spentAmount;
      const percentageUsed = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;

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
        budget_amount: category.budget_amount,
        spent_amount: spentAmount.toFixed(2),
        balance: balance.toFixed(2),
        status,
        percentage_used: parseFloat(percentageUsed.toFixed(2)),
      };
    });

    // Calculate totals
    const totalBudget = categoryOverviews.reduce(
      (sum, cat) => sum + parseFloat(cat.budget_amount),
      0
    );
    const totalSpent = categoryOverviews.reduce(
      (sum, cat) => sum + parseFloat(cat.spent_amount),
      0
    );
    const totalBalance = totalBudget - totalSpent;

    const categoriesWarning = categoryOverviews.filter((c) => c.status === 'warning').length;
    const categoriesExceeded = categoryOverviews.filter((c) => c.status === 'exceeded').length;

    return {
      total_budget: totalBudget.toFixed(2),
      total_spent: totalSpent.toFixed(2),
      total_balance: totalBalance.toFixed(2),
      categories_warning: categoriesWarning,
      categories_exceeded: categoriesExceeded,
      categories: categoryOverviews,
    };
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
        overage: cat.status === 'exceeded' ? Math.abs(parseFloat(cat.balance)).toFixed(2) : '0',
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

    const [result] = await db
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

    const budgetAmount = parseFloat(category.budget_amount);
    const spentAmount = parseFloat(result?.total || '0');
    const remaining = budgetAmount - spentAmount;

    return {
      category_id: category.id,
      category_name: category.name,
      budget_amount: category.budget_amount,
      spent_amount: spentAmount.toFixed(2),
      remaining: remaining.toFixed(2),
      percentage_used: budgetAmount > 0 ? ((spentAmount / budgetAmount) * 100).toFixed(2) : '0',
    };
  }
}

export const budgetService = new BudgetService();
