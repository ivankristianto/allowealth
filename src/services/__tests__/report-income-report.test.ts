/**
 * Income Report Integration Tests
 *
 * Tests getOverviewReport, getExpenseReport, and getIncomeReport methods
 * against a real SQLite database with controlled test data.
 *
 * Run: bun test src/services/__tests__/report-income-report.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { nanoid } from 'nanoid';
import { join } from 'node:path';
import { unlinkSync, existsSync } from 'node:fs';

import * as schema from '@/db/schema/sqlite';
import type { IDatabase } from '@/db';
import { ReportService } from '@/services/report.service';

const DB_PATH = join(import.meta.dir, `income-test-${nanoid(8)}.sqlite`);
const WORKSPACE_ID = `ws-${nanoid(8)}`;
const USER_A = `usr-a-${nanoid(8)}`;
const USER_B = `usr-b-${nanoid(8)}`;
const CURRENCY = 'IDR';

// Categories with different source types
const CAT_SALARY = `cat-salary-${nanoid(8)}`;
const CAT_FREELANCE = `cat-freelance-${nanoid(8)}`;
const CAT_DIVIDENDS = `cat-dividends-${nanoid(8)}`;
const CAT_RENTAL = `cat-rental-${nanoid(8)}`;
const CAT_GIFTS = `cat-gifts-${nanoid(8)}`;
const CAT_NO_SOURCE = `cat-nosrc-${nanoid(8)}`;
const CAT_EXPENSE = `cat-expense-${nanoid(8)}`;
const ACCOUNT_ID = `acc-${nanoid(8)}`;

let rawDb: Database;
let db: ReturnType<typeof drizzle>;
let reportService: ReportService;

beforeAll(() => {
  rawDb = new Database(DB_PATH);
  rawDb.prepare('PRAGMA journal_mode = WAL').run();
  rawDb.prepare('PRAGMA foreign_keys = ON').run();

  db = drizzle(rawDb, { schema });
  migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle', 'sqlite') });

  seedTestData(db);

  reportService = new ReportService(db as unknown as IDatabase);
});

afterAll(() => {
  try {
    rawDb?.close();
  } catch {}
  if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
  for (const suffix of ['-wal', '-shm']) {
    const p = DB_PATH + suffix;
    if (existsSync(p)) unlinkSync(p);
  }
});

function seedTestData(db: ReturnType<typeof drizzle>) {
  const now = new Date();

  db.insert(schema.workspaces)
    .values({
      id: WORKSPACE_ID,
      name: 'Income Test Workspace',
      status: 'active',
      created_at: now,
      updated_at: now,
    })
    .run();

  db.insert(schema.users)
    .values([
      {
        id: USER_A,
        workspace_id: WORKSPACE_ID,
        email: 'user-a@test.com',
        name: 'User A',
        role: 'admin',
        password_hash: 'x',
        created_at: now,
        updated_at: now,
      },
      {
        id: USER_B,
        workspace_id: WORKSPACE_ID,
        email: 'user-b@test.com',
        name: 'User B',
        role: 'member',
        password_hash: 'x',
        created_at: now,
        updated_at: now,
      },
    ])
    .run();

  // Income categories with different source types
  db.insert(schema.categories)
    .values([
      {
        id: CAT_SALARY,
        workspace_id: WORKSPACE_ID,
        created_by_user_id: USER_A,
        name: 'Salary',
        type: 'income',
        income_source_type: 'active',
        icon: 'briefcase',
        color: 'bg-success',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: CAT_FREELANCE,
        workspace_id: WORKSPACE_ID,
        created_by_user_id: USER_A,
        name: 'Freelance',
        type: 'income',
        income_source_type: 'active',
        icon: 'laptop',
        color: 'bg-info',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: CAT_DIVIDENDS,
        workspace_id: WORKSPACE_ID,
        created_by_user_id: USER_A,
        name: 'Dividends',
        type: 'income',
        income_source_type: 'passive',
        icon: 'trending-up',
        color: 'bg-warning',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: CAT_RENTAL,
        workspace_id: WORKSPACE_ID,
        created_by_user_id: USER_A,
        name: 'Rental',
        type: 'income',
        income_source_type: 'passive',
        icon: 'home',
        color: 'bg-warning',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: CAT_GIFTS,
        workspace_id: WORKSPACE_ID,
        created_by_user_id: USER_A,
        name: 'Gifts',
        type: 'income',
        income_source_type: 'other',
        icon: 'gift',
        color: 'bg-neutral',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: CAT_NO_SOURCE,
        workspace_id: WORKSPACE_ID,
        created_by_user_id: USER_A,
        name: 'Miscellaneous',
        type: 'income',
        // income_source_type defaults to 'other' per schema
        icon: 'circle',
        color: 'bg-neutral',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: CAT_EXPENSE,
        workspace_id: WORKSPACE_ID,
        created_by_user_id: USER_A,
        name: 'Food',
        type: 'expense',
        icon: 'utensils',
        color: 'bg-error',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ])
    .run();

  db.insert(schema.accounts)
    .values({
      id: ACCOUNT_ID,
      workspace_id: WORKSPACE_ID,
      created_by_user_id: USER_A,
      name: 'Main Account',
      type: 'bank_account',
      account_class: 'liquid',
      balance: '50000000',
      initial_balance: '10000000',
      currency: CURRENCY,
      is_cash_account: false,
      status: 'active',
      last_updated: now,
      created_at: now,
      updated_at: now,
    })
    .run();

  // Jan 2025 transactions:
  // User A: Salary 10M (active), Freelance 3M (active), Dividends 2M (passive), Gifts 500k (other)
  // User B: Salary 8M (active), Rental 1M (passive)
  // Expenses: Food 2M
  const jan = (day: number) => new Date(2025, 0, day, 12, 0, 0);

  const txns = [
    // User A income
    {
      id: `txn-${nanoid(8)}`,
      user: USER_A,
      cat: CAT_SALARY,
      type: 'income' as const,
      amount: '10000000',
      date: jan(5),
      desc: 'January salary',
    },
    {
      id: `txn-${nanoid(8)}`,
      user: USER_A,
      cat: CAT_FREELANCE,
      type: 'income' as const,
      amount: '3000000',
      date: jan(10),
      desc: 'Freelance project',
    },
    {
      id: `txn-${nanoid(8)}`,
      user: USER_A,
      cat: CAT_DIVIDENDS,
      type: 'income' as const,
      amount: '2000000',
      date: jan(15),
      desc: 'Stock dividends',
    },
    {
      id: `txn-${nanoid(8)}`,
      user: USER_A,
      cat: CAT_GIFTS,
      type: 'income' as const,
      amount: '500000',
      date: jan(20),
      desc: 'Birthday gift',
    },
    // User B income
    {
      id: `txn-${nanoid(8)}`,
      user: USER_B,
      cat: CAT_SALARY,
      type: 'income' as const,
      amount: '8000000',
      date: jan(5),
      desc: 'January salary B',
    },
    {
      id: `txn-${nanoid(8)}`,
      user: USER_B,
      cat: CAT_RENTAL,
      type: 'income' as const,
      amount: '1000000',
      date: jan(10),
      desc: 'Rental income',
    },
    // Expense
    {
      id: `txn-${nanoid(8)}`,
      user: USER_A,
      cat: CAT_EXPENSE,
      type: 'expense' as const,
      amount: '2000000',
      date: jan(12),
      desc: 'Food expenses',
    },
  ];

  // Dec 2024 — previous month for growth calculation
  const dec = (day: number) => new Date(2024, 11, day, 12, 0, 0);
  txns.push(
    {
      id: `txn-${nanoid(8)}`,
      user: USER_A,
      cat: CAT_SALARY,
      type: 'income' as const,
      amount: '9000000',
      date: dec(5),
      desc: 'Dec salary',
    },
    {
      id: `txn-${nanoid(8)}`,
      user: USER_A,
      cat: CAT_FREELANCE,
      type: 'income' as const,
      amount: '1000000',
      date: dec(10),
      desc: 'Dec freelance',
    }
  );

  db.insert(schema.transactions)
    .values(
      txns.map((t) => ({
        id: t.id,
        workspace_id: WORKSPACE_ID,
        created_by_user_id: t.user,
        category_id: t.cat,
        account_id: ACCOUNT_ID,
        type: t.type,
        amount: t.amount,
        currency: CURRENCY,
        description: t.desc,
        transaction_date: t.date,
        created_at: t.date,
        updated_at: t.date,
      }))
    )
    .run();
}

describe('Income Report Integration', () => {
  describe('getIncomeReport', () => {
    it('returns correct source group totals for monthly period', async () => {
      const result = await reportService.getIncomeReport(
        WORKSPACE_ID,
        '2025-01',
        'monthly',
        CURRENCY
      );

      // Active: Salary 10M + Freelance 3M + Salary 8M = 21M
      // Passive: Dividends 2M + Rental 1M = 3M
      // Other: Gifts 500k = 0.5M
      // Total: 24.5M
      expect(result.summary.totalIncome).toBe('24500000');
      expect(result.summary.activeIncome).toBe('21000000');
      expect(result.summary.passiveIncome).toBe('3000000');
      expect(result.summary.otherIncome).toBe('500000');
    });

    it('calculates growth vs previous period', async () => {
      const result = await reportService.getIncomeReport(
        WORKSPACE_ID,
        '2025-01',
        'monthly',
        CURRENCY
      );

      // Jan: 24.5M, Dec: 10M => growth = (24.5M - 10M) / 10M * 100 = 145
      expect(parseFloat(result.summary.growthVsPreviousPeriod)).toBe(145);
      expect(result.summary.previousPeriodLabel).toBe('Dec 2024');
    });

    it('returns source mix by category', async () => {
      const result = await reportService.getIncomeReport(
        WORKSPACE_ID,
        '2025-01',
        'monthly',
        CURRENCY
      );

      expect(result.sourceMix.length).toBeGreaterThan(0);
      // Salary should be highest (10M + 8M = 18M)
      expect(result.sourceMix[0].name).toBe('Salary');
      expect(result.sourceMix[0].value).toBe('18000000');
    });

    it('returns member income breakdown', async () => {
      const result = await reportService.getIncomeReport(
        WORKSPACE_ID,
        '2025-01',
        'monthly',
        CURRENCY
      );

      expect(result.members.length).toBe(2);
      // User A: 10M + 3M + 2M + 500k = 15.5M
      const userA = result.members.find((m) => m.userId === USER_A);
      expect(userA).toBeDefined();
      expect(userA!.totalIncome).toBe('15500000');
      expect(userA!.transactionCount).toBe(4);

      // User B: 8M + 1M = 9M
      const userB = result.members.find((m) => m.userId === USER_B);
      expect(userB).toBeDefined();
      expect(userB!.totalIncome).toBe('9000000');
      expect(userB!.transactionCount).toBe(2);
    });

    it('returns paginated history', async () => {
      const result = await reportService.getIncomeReport(
        WORKSPACE_ID,
        '2025-01',
        'monthly',
        CURRENCY,
        {
          pageSize: 2,
          page: 1,
        }
      );

      expect(result.history.transactions.length).toBe(2);
      expect(result.history.total).toBe(6); // 6 income txns in Jan
      expect(result.history.page).toBe(1);
      expect(result.history.pageSize).toBe(2);
    });

    it('filters history by sourceType', async () => {
      const result = await reportService.getIncomeReport(
        WORKSPACE_ID,
        '2025-01',
        'monthly',
        CURRENCY,
        {
          sourceType: 'passive',
        }
      );

      // History should only contain passive transactions
      for (const tx of result.history.transactions) {
        expect(tx.income_source_type).toBe('passive');
      }
      expect(result.history.total).toBe(2); // Dividends + Rental
      expect(result.history.appliedFilters.sourceType).toBe('passive');
    });

    it('filters history by userId', async () => {
      const result = await reportService.getIncomeReport(
        WORKSPACE_ID,
        '2025-01',
        'monthly',
        CURRENCY,
        {
          userId: USER_B,
        }
      );

      // Summary should only show User B's totals
      expect(result.summary.totalIncome).toBe('9000000');
      expect(result.history.transactions.length).toBe(2);
      expect(result.history.appliedFilters.userId).toBe(USER_B);
    });

    it('returns source group trend data', async () => {
      const result = await reportService.getIncomeReport(
        WORKSPACE_ID,
        '2025-01',
        'monthly',
        CURRENCY
      );

      expect(result.sourceGroupTrend.length).toBeGreaterThan(0);
      // Each trend point should have active/passive/other
      for (const point of result.sourceGroupTrend) {
        expect(point).toHaveProperty('name');
        expect(point).toHaveProperty('active');
        expect(point).toHaveProperty('passive');
        expect(point).toHaveProperty('other');
      }
    });
  });

  describe('getOverviewReport', () => {
    it('returns correct totals and savings rate', async () => {
      const result = await reportService.getOverviewReport(
        WORKSPACE_ID,
        '2025-01',
        'monthly',
        CURRENCY
      );

      // Income: 24.5M, Expenses: 2M
      expect(result.totalIncome).toBe('24500000');
      expect(result.totalExpenses).toBe('2000000');
      expect(result.netSavings).toBe('22500000');

      // Savings rate: 22.5M / 24.5M * 100 ≈ 91.83...
      const rate = parseFloat(result.savingsRate);
      expect(rate).toBeGreaterThan(91);
      expect(rate).toBeLessThan(92);
    });

    it('returns all income and expense preview categories sorted descending by value', async () => {
      const result = await reportService.getOverviewReport(
        WORKSPACE_ID,
        '2025-01',
        'monthly',
        CURRENCY
      );

      expect(result.incomePreview.topCategories).toHaveLength(5);
      expect(result.incomePreview.topCategories.map((category) => category.name)).toEqual([
        'Salary',
        'Freelance',
        'Dividends',
        'Rental',
        'Gifts',
      ]);
      expect(result.incomePreview.total).toBe('24500000');
      expect(result.expensePreview.topCategories).toHaveLength(1);
      expect(result.expensePreview.topCategories.map((category) => category.name)).toEqual([
        'Food',
      ]);
      expect(result.expensePreview.total).toBe('2000000');
    });

    it('returns trend data', async () => {
      const result = await reportService.getOverviewReport(
        WORKSPACE_ID,
        '2025-01',
        'monthly',
        CURRENCY
      );

      expect(result.trendData.length).toBeGreaterThan(0);
      for (const point of result.trendData) {
        expect(point).toHaveProperty('name');
        expect(point).toHaveProperty('income');
        expect(point).toHaveProperty('expenses');
      }
    });

    it('handles zero income gracefully for savings rate', async () => {
      // Use a period with no data
      const result = await reportService.getOverviewReport(
        WORKSPACE_ID,
        '2020-01',
        'monthly',
        CURRENCY
      );

      expect(result.savingsRate).toBe('0');
      expect(result.totalIncome).toBe('0');
    });
  });

  describe('getExpenseReport', () => {
    it('returns base report data plus member summary', async () => {
      const result = await reportService.getExpenseReport(
        WORKSPACE_ID,
        '2025-01',
        'monthly',
        CURRENCY
      );

      expect(result.totalExpenses).toBe('2000000');
      expect(result.memberSummary).toBeDefined();
      expect(Array.isArray(result.memberSummary)).toBe(true);
    });

    it('includes recurring breakdown for monthly range', async () => {
      const result = await reportService.getExpenseReport(
        WORKSPACE_ID,
        '2025-01',
        'monthly',
        CURRENCY
      );

      // May be null if no recurring templates, but should not throw
      expect(result).toHaveProperty('recurringBreakdown');
    });
  });

  describe('edge cases', () => {
    it('categories missing income_source_type default to other', async () => {
      // CAT_NO_SOURCE was created without explicit income_source_type
      // Schema defaults it to 'other'
      // Create a transaction against it
      const txId = `txn-nosrc-${nanoid(8)}`;
      const date = new Date(2025, 1, 5, 12, 0, 0); // Feb 2025

      db.insert(schema.transactions)
        .values({
          id: txId,
          workspace_id: WORKSPACE_ID,
          created_by_user_id: USER_A,
          category_id: CAT_NO_SOURCE,
          account_id: ACCOUNT_ID,
          type: 'income',
          amount: '1000000',
          currency: CURRENCY,
          description: 'Misc income',
          transaction_date: date,
          created_at: date,
          updated_at: date,
        })
        .run();

      const result = await reportService.getIncomeReport(
        WORKSPACE_ID,
        '2025-02',
        'monthly',
        CURRENCY
      );

      expect(result.summary.otherIncome).toBe('1000000');
      expect(result.summary.activeIncome).toBe('0');
      expect(result.summary.passiveIncome).toBe('0');
    });

    it('returns safe defaults for period with no data', async () => {
      const result = await reportService.getIncomeReport(
        WORKSPACE_ID,
        '2020-06',
        'monthly',
        CURRENCY
      );

      expect(result.summary.totalIncome).toBe('0');
      expect(result.summary.activeIncome).toBe('0');
      expect(result.summary.passiveIncome).toBe('0');
      expect(result.summary.otherIncome).toBe('0');
      expect(result.sourceMix).toEqual([]);
      expect(result.members).toEqual([]);
      expect(result.history.transactions).toEqual([]);
      expect(result.history.total).toBe(0);
    });
  });
});
