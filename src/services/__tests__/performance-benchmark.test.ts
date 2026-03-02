/**
 * Performance Benchmark Test Suite v2
 *
 * Creates a real SQLite database with ~10k transactions and measures:
 * - Query count per service method (catches N+1 regressions)
 * - Wall-clock execution time (catches catastrophic regressions)
 *
 * Run: bun test src/services/__tests__/performance-benchmark.test.ts
 *
 * CI usage: the test writes results to `perf-results.json` in the project root
 * for the `scripts/analyze-performance.ts` reporter to consume.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { nanoid } from 'nanoid';
import { join } from 'node:path';
import { unlinkSync, existsSync, writeFileSync } from 'node:fs';

import * as schema from '@/db/schema/sqlite';
import type { IDatabase } from '@/db';
import { PerfCollector } from '@/lib/perf/collector';

import { ReportService } from '../report.service';
import { TransactionService } from '../transaction.service';
import { RecurringOccurrenceService } from '../recurring-occurrence.service';
import { RecurringTemplateService } from '../recurring-template.service';
import { AccountService } from '../account.service';
import { BudgetService } from '../budget.service';
import { DashboardService } from '../dashboard.service';
import { CategoryService } from '../category.service';
import { AccountCategoryService } from '../account-category.service';
import { WorkspaceService } from '../workspace.service';
import { UserService } from '../user.service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DB_PATH = join(import.meta.dir, `bench-${nanoid(8)}.sqlite`);
const RESULTS_PATH = join(process.cwd(), 'perf-results.json');
const WORKSPACE_ID = `ws-${nanoid(8)}`;
const USER_ID = `usr-${nanoid(8)}`;
const MEMBER_USER_ID = `usr-${nanoid(8)}`;
const CURRENCY = 'IDR';
const NOW = new Date();

// Trailing 12-month window — all months guaranteed in the past
const BENCH_MONTHS: Array<{ year: number; month: number }> = [];
for (let i = 11; i >= 0; i--) {
  const d = new Date(NOW.getFullYear(), NOW.getMonth() - i, 1);
  BENCH_MONTHS.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
}
// Use a recent past month for test queries (middle of the window)
const TEST_MONTH = BENCH_MONTHS[6];

// Data scale
const NUM_EXPENSE_CATEGORIES = 10;
const NUM_INCOME_CATEGORIES = 3;
const NUM_ACCOUNTS = 5;
const NUM_TRANSACTIONS = 10_000;
const NUM_RECURRING_TEMPLATES = 20;

// ---------------------------------------------------------------------------
// Thresholds — generous to avoid flaky tests, tight enough to catch N+1
// ---------------------------------------------------------------------------

const THRESHOLDS: Record<string, { maxQueries: number | null; maxMs: number }> = {
  // Original 7
  'ReportService.getMonthlyReport': { maxQueries: null, maxMs: 500 },
  'ReportService.getYearlyReport': { maxQueries: null, maxMs: 500 },
  'TransactionService.getMonthSummary': { maxQueries: null, maxMs: 200 },
  'TransactionService.findAll': { maxQueries: 5, maxMs: 200 },
  'RecurringOccurrenceService.getStats': { maxQueries: null, maxMs: 200 },
  'RecurringTemplateService.findAll': { maxQueries: 5, maxMs: 300 },
  'AccountService.getHistory': { maxQueries: 5, maxMs: 200 },

  // P1 — Page-load hot paths
  'DashboardService.getDashboardData': { maxQueries: 15, maxMs: 500 },
  'BudgetService.getMonthlyOverview': { maxQueries: 10, maxMs: 300 },
  'BudgetService.getBudgetHistory': { maxQueries: 15, maxMs: 500 },
  'AccountService.findAll': { maxQueries: 5, maxMs: 200 },
  'AccountService.getTotalByCurrency': { maxQueries: 3, maxMs: 200 },
  'AccountService.getTotalByType': { maxQueries: 3, maxMs: 200 },
  'AccountService.getTotalByClass': { maxQueries: 3, maxMs: 200 },
  'AccountService.getSnapshotForMonth': { maxQueries: 10, maxMs: 300 },

  // P2 — User interaction paths
  // Note: maxQueries is null for methods that don't accept PerfCollector
  'ReportService.getRecurringBreakdown': { maxQueries: null, maxMs: 300 },
  'ReportService.getMemberSummary': { maxQueries: null, maxMs: 300 },
  'ReportService.getCategoryTransactions': { maxQueries: null, maxMs: 300 },
  'TransactionService.getTransactionsByAccount': { maxQueries: null, maxMs: 200 },
  'TransactionService.getHistory': { maxQueries: null, maxMs: 200 },
  'TransactionService.getCategoryUsageCounts': { maxQueries: null, maxMs: 200 },
  'TransactionService.count': { maxQueries: 3, maxMs: 200 },
  'RecurringOccurrenceService.findPending': { maxQueries: 5, maxMs: 200 },
  'RecurringOccurrenceService.getMonthlySummary': { maxQueries: null, maxMs: 200 },
  'RecurringOccurrenceService.getCalendarData': { maxQueries: null, maxMs: 200 },
  'BudgetService.getCategoryTrends': { maxQueries: 10, maxMs: 400 },
  'BudgetService.getAlerts': { maxQueries: 10, maxMs: 300 },
  'BudgetService.findAllBudgets': { maxQueries: null, maxMs: 200 },
  'AccountService.findAllWithHistory': { maxQueries: 5, maxMs: 300 },
  'AccountService.getLastBalanceBefore': { maxQueries: null, maxMs: 200 },
  'WorkspaceService.getOnboardingStatus': { maxQueries: null, maxMs: 200 },

  // P3 — Simple lookups
  'TransactionService.findById': { maxQueries: 3, maxMs: 100 },
  'RecurringTemplateService.findById': { maxQueries: null, maxMs: 100 },
  'RecurringTemplateService.hasTemplates': { maxQueries: null, maxMs: 100 },
  'RecurringOccurrenceService.findByTemplate': { maxQueries: null, maxMs: 100 },
  'AccountService.findById': { maxQueries: null, maxMs: 100 },
  'AccountService.findAllClosed': { maxQueries: 3, maxMs: 200 },
  'AccountService.countClosed': { maxQueries: null, maxMs: 100 },
  'AccountService.countByCategory': { maxQueries: null, maxMs: 100 },
  'CategoryService.findAll': { maxQueries: 3, maxMs: 100 },
  'CategoryService.findById': { maxQueries: 2, maxMs: 100 },
  'BudgetService.getBudgetByCategory': { maxQueries: null, maxMs: 100 },
  'BudgetService.hasBudgetsForMonth': { maxQueries: null, maxMs: 100 },
  'AccountCategoryService.findAll': { maxQueries: null, maxMs: 100 },
  'WorkspaceService.getMembers': { maxQueries: null, maxMs: 100 },
  'UserService.getById': { maxQueries: null, maxMs: 100 },
};

// ---------------------------------------------------------------------------
// ID pools (pre-generated for FK references)
// ---------------------------------------------------------------------------

const expenseCategoryIds = Array.from({ length: NUM_EXPENSE_CATEGORIES }, () => `cat-${nanoid(8)}`);
const incomeCategoryIds = Array.from({ length: NUM_INCOME_CATEGORIES }, () => `cat-${nanoid(8)}`);
const accountIds = Array.from({ length: NUM_ACCOUNTS }, () => `acc-${nanoid(8)}`);
const accountCategoryIds = [`acat-${nanoid(8)}`, `acat-${nanoid(8)}`];
const templateIds = Array.from({ length: NUM_RECURRING_TEMPLATES }, () => `tpl-${nanoid(8)}`);

// Will be populated during seeding
let firstTxnId = '';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAmount(min: number, max: number): string {
  return String(Math.floor(Math.random() * (max - min) + min));
}

function dateInMonth(year: number, month: number, day?: number): Date {
  const maxDay = new Date(year, month, 0).getDate();
  const d = day ?? Math.floor(Math.random() * maxDay) + 1;
  return new Date(year, month - 1, Math.min(d, maxDay), 12, 0, 0);
}

// ---------------------------------------------------------------------------
// Results collector — written to JSON after all tests
// ---------------------------------------------------------------------------

interface BenchmarkResult {
  method: string;
  queries: number | null;
  maxQueries: number | null;
  durationMs: number;
  maxMs: number;
  status: 'pass' | 'fail';
}

const results: BenchmarkResult[] = [];

function recordResult(method: string, queries: number | null, durationMs: number) {
  const threshold = THRESHOLDS[method];
  // queries===null means no PerfCollector was used — skip query check
  const queryOk =
    threshold.maxQueries === null || queries === null || queries <= threshold.maxQueries;
  const timeOk = durationMs < threshold.maxMs;
  results.push({
    method,
    queries,
    maxQueries: threshold.maxQueries,
    durationMs: Math.round(durationMs * 10) / 10,
    maxMs: threshold.maxMs,
    status: queryOk && timeOk ? 'pass' : 'fail',
  });
}

// ---------------------------------------------------------------------------
// Database setup
// ---------------------------------------------------------------------------

let rawDb: Database;
let db: ReturnType<typeof drizzle>;

// Services under test
let reportService: ReportService;
let transactionService: TransactionService;
let recurringOccurrenceService: RecurringOccurrenceService;
let recurringTemplateService: RecurringTemplateService;
let accountService: AccountService;
let budgetService: BudgetService;
let dashboardService: DashboardService;
let categoryService: CategoryService;
let accountCategoryService: AccountCategoryService;
let workspaceService: WorkspaceService;
let userService: UserService;

beforeAll(() => {
  // 1. Create temp SQLite database
  rawDb = new Database(DB_PATH);
  rawDb.prepare('PRAGMA journal_mode = WAL').run();
  rawDb.prepare('PRAGMA synchronous = NORMAL').run();
  rawDb.prepare('PRAGMA cache_size = -64000').run();
  rawDb.prepare('PRAGMA foreign_keys = ON').run();

  db = drizzle(rawDb, { schema });

  // 2. Apply all migrations
  migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle', 'sqlite') });

  // 3. Seed data
  seedDatabase(db);

  // 4. Instantiate services with benchmark DB
  const benchDb = db as unknown as IDatabase;
  reportService = new ReportService(benchDb);
  transactionService = new TransactionService(benchDb);
  recurringTemplateService = new RecurringTemplateService(benchDb);
  recurringOccurrenceService = new RecurringOccurrenceService(benchDb, transactionService);
  accountService = new AccountService(benchDb);
  budgetService = new BudgetService(benchDb);
  dashboardService = new DashboardService(benchDb);
  categoryService = new CategoryService(benchDb);
  accountCategoryService = new AccountCategoryService(benchDb);
  workspaceService = new WorkspaceService(benchDb);
  userService = new UserService(benchDb);
});

afterAll(() => {
  // Write results JSON for the CI reporter
  writeFileSync(
    RESULTS_PATH,
    JSON.stringify(
      {
        results,
        dataScale: {
          transactions: NUM_TRANSACTIONS,
          categories: NUM_EXPENSE_CATEGORIES + NUM_INCOME_CATEGORIES,
          accounts: NUM_ACCOUNTS,
          recurringTemplates: NUM_RECURRING_TEMPLATES,
        },
      },
      null,
      2
    )
  );

  try {
    rawDb?.close();
  } catch {
    // ignore
  }
  if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
  // WAL/SHM files
  for (const suffix of ['-wal', '-shm']) {
    const p = DB_PATH + suffix;
    if (existsSync(p)) unlinkSync(p);
  }
});

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

function seedDatabase(db: ReturnType<typeof drizzle>) {
  const now = new Date();

  // Workspace
  db.insert(schema.workspaces)
    .values({
      id: WORKSPACE_ID,
      name: 'Benchmark Workspace',
      status: 'active',
      created_at: now,
      updated_at: now,
    })
    .run();

  // Workspace meta (for getOnboardingStatus)
  db.insert(schema.workspaceMeta)
    .values([
      {
        id: `wm-${nanoid(8)}`,
        workspace_id: WORKSPACE_ID,
        meta_key: 'currency',
        meta_value: 'IDR',
        created_at: now,
        updated_at: now,
      },
      {
        id: `wm-${nanoid(8)}`,
        workspace_id: WORKSPACE_ID,
        meta_key: 'monthly_income',
        meta_value: '30000000',
        created_at: now,
        updated_at: now,
      },
    ])
    .run();

  // Admin user
  db.insert(schema.users)
    .values({
      id: USER_ID,
      workspace_id: WORKSPACE_ID,
      email: `bench-${nanoid(4)}@test.com`,
      name: 'Benchmark User',
      role: 'admin',
      password_hash: 'not-real',
      created_at: now,
      updated_at: now,
    })
    .run();

  // Member user (for getMemberSummary)
  db.insert(schema.users)
    .values({
      id: MEMBER_USER_ID,
      workspace_id: WORKSPACE_ID,
      email: `bench-member-${nanoid(4)}@test.com`,
      name: 'Benchmark Member',
      role: 'member',
      password_hash: 'not-real',
      created_at: now,
      updated_at: now,
    })
    .run();

  // Expense categories
  for (let i = 0; i < NUM_EXPENSE_CATEGORIES; i++) {
    db.insert(schema.categories)
      .values({
        id: expenseCategoryIds[i],
        workspace_id: WORKSPACE_ID,
        created_by_user_id: USER_ID,
        name: `Expense Cat ${i + 1}`,
        type: 'expense',
        icon: 'tag',
        color: 'bg-neutral',
        is_active: true,
        created_at: now,
        updated_at: now,
      })
      .run();
  }

  // Income categories
  for (let i = 0; i < NUM_INCOME_CATEGORIES; i++) {
    db.insert(schema.categories)
      .values({
        id: incomeCategoryIds[i],
        workspace_id: WORKSPACE_ID,
        created_by_user_id: USER_ID,
        name: `Income Cat ${i + 1}`,
        type: 'income',
        icon: 'banknote',
        color: 'bg-success',
        is_active: true,
        created_at: now,
        updated_at: now,
      })
      .run();
  }

  // Account categories (for AccountCategoryService.findAll)
  db.insert(schema.accountCategories)
    .values([
      {
        id: accountCategoryIds[0],
        workspace_id: WORKSPACE_ID,
        created_by_user_id: USER_ID,
        name: 'Savings',
        is_liability: false,
        is_system: false,
        created_at: now,
        updated_at: now,
      },
      {
        id: accountCategoryIds[1],
        workspace_id: WORKSPACE_ID,
        created_by_user_id: USER_ID,
        name: 'Debt',
        is_liability: true,
        is_system: false,
        created_at: now,
        updated_at: now,
      },
    ])
    .run();

  // Accounts
  const accountTypes = ['cash', 'bank_account', 'e_wallet', 'bank_account', 'mutual_fund'] as const;
  for (let i = 0; i < NUM_ACCOUNTS; i++) {
    db.insert(schema.accounts)
      .values({
        id: accountIds[i],
        workspace_id: WORKSPACE_ID,
        created_by_user_id: USER_ID,
        name: `Account ${i + 1}`,
        type: accountTypes[i],
        account_class: i < 3 ? 'liquid' : 'non_liquid',
        balance: randomAmount(1_000_000, 100_000_000),
        initial_balance: '10000000',
        currency: CURRENCY,
        is_cash_account: i === 0,
        status: i < 4 ? 'active' : 'closed', // Last account closed for findAllClosed
        last_updated: now,
        created_at: now,
        updated_at: now,
      })
      .run();
  }

  // Account history — 12 trailing months per account
  for (const accId of accountIds) {
    for (const { year, month } of BENCH_MONTHS) {
      db.insert(schema.accountHistory)
        .values({
          id: `ah-${nanoid(8)}`,
          account_id: accId,
          balance: randomAmount(1_000_000, 100_000_000),
          recorded_at: dateInMonth(year, month, 15),
        })
        .run();
    }
  }

  // Account snapshots (3 months for getSnapshotForMonth)
  for (let si = 0; si < 3; si++) {
    const sm = BENCH_MONTHS[BENCH_MONTHS.length - 1 - si];
    const snapshotId = `snap-${nanoid(8)}`;
    db.insert(schema.accountSnapshots)
      .values({
        id: snapshotId,
        workspace_id: WORKSPACE_ID,
        created_by_user_id: USER_ID,
        snapshot_date: dateInMonth(sm.year, sm.month, 28),
        month: sm.month,
        year: sm.year,
        notes: null,
        created_at: now,
      })
      .run();

    for (const accId of accountIds) {
      db.insert(schema.accountSnapshotItems)
        .values({
          id: `si-${nanoid(8)}`,
          snapshot_id: snapshotId,
          account_id: accId,
          balance: randomAmount(1_000_000, 100_000_000),
          currency: CURRENCY,
        })
        .run();
    }
  }

  // Budgets (one per expense category per trailing month)
  for (const catId of expenseCategoryIds) {
    for (const { year, month } of BENCH_MONTHS) {
      db.insert(schema.budgets)
        .values({
          id: `bgt-${nanoid(8)}`,
          workspace_id: WORKSPACE_ID,
          created_by_user_id: USER_ID,
          category_id: catId,
          month,
          year,
          budget_amount: randomAmount(2_000_000, 10_000_000),
          currency: CURRENCY,
          created_at: now,
          updated_at: now,
        })
        .run();
    }
  }

  // Transactions (~10k spread across trailing 12 months)
  const txnBatchSize = 500;
  const txnValues: Array<{
    id: string;
    workspace_id: string;
    created_by_user_id: string;
    category_id: string;
    account_id: string;
    type: 'expense' | 'income';
    amount: string;
    currency: string;
    description: string;
    transaction_date: Date;
    created_at: Date;
    updated_at: Date;
  }> = [];

  const allTxnIds: string[] = [];

  // Admin user transactions (~9.5k)
  const adminTxnCount = NUM_TRANSACTIONS - 500;
  for (let i = 0; i < adminTxnCount; i++) {
    const isIncome = Math.random() < 0.25;
    const bm = BENCH_MONTHS[i % BENCH_MONTHS.length];
    const txDate = dateInMonth(bm.year, bm.month);
    const txnId = `txn-${nanoid(8)}`;
    allTxnIds.push(txnId);

    txnValues.push({
      id: txnId,
      workspace_id: WORKSPACE_ID,
      created_by_user_id: USER_ID,
      category_id: isIncome ? randomItem(incomeCategoryIds) : randomItem(expenseCategoryIds),
      account_id: randomItem(accountIds),
      type: isIncome ? 'income' : 'expense',
      amount: isIncome ? randomAmount(3_000_000, 30_000_000) : randomAmount(10_000, 5_000_000),
      currency: CURRENCY,
      description: isIncome ? `Income txn ${i}` : `Expense txn ${i}`,
      transaction_date: txDate,
      created_at: txDate,
      updated_at: txDate,
    });

    if (txnValues.length >= txnBatchSize) {
      db.insert(schema.transactions).values(txnValues).run();
      txnValues.length = 0;
    }
  }

  // Member user transactions (~500)
  for (let i = 0; i < 500; i++) {
    const isIncome = Math.random() < 0.2;
    const bm = BENCH_MONTHS[i % BENCH_MONTHS.length];
    const txDate = dateInMonth(bm.year, bm.month);

    txnValues.push({
      id: `txn-${nanoid(8)}`,
      workspace_id: WORKSPACE_ID,
      created_by_user_id: MEMBER_USER_ID,
      category_id: isIncome ? randomItem(incomeCategoryIds) : randomItem(expenseCategoryIds),
      account_id: randomItem(accountIds),
      type: isIncome ? 'income' : 'expense',
      amount: isIncome ? randomAmount(2_000_000, 10_000_000) : randomAmount(10_000, 3_000_000),
      currency: CURRENCY,
      description: `Member txn ${i}`,
      transaction_date: txDate,
      created_at: txDate,
      updated_at: txDate,
    });

    if (txnValues.length >= txnBatchSize) {
      db.insert(schema.transactions).values(txnValues).run();
      txnValues.length = 0;
    }
  }

  if (txnValues.length > 0) {
    db.insert(schema.transactions).values(txnValues).run();
    txnValues.length = 0;
  }

  // Save first transaction ID for findById test
  firstTxnId = allTxnIds[0];

  // Audit logs (~100 entries for getHistory / getTransactionIdsWithHistory)
  const auditValues: Array<{
    id: string;
    workspace_id: string;
    user_id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    old_value: string | null;
    new_value: string | null;
    created_at: Date;
  }> = [];

  for (let a = 0; a < 100; a++) {
    const txnId = allTxnIds[a % allTxnIds.length];
    auditValues.push({
      id: `al-${nanoid(8)}`,
      workspace_id: WORKSPACE_ID,
      user_id: USER_ID,
      action: a % 2 === 0 ? 'create' : 'update',
      entity_type: 'transaction',
      entity_id: txnId,
      old_value: a % 2 === 0 ? null : JSON.stringify({ amount: '100000' }),
      new_value: JSON.stringify({ amount: '150000', type: 'expense' }),
      created_at: dateInMonth(
        BENCH_MONTHS[a % BENCH_MONTHS.length].year,
        BENCH_MONTHS[a % BENCH_MONTHS.length].month
      ),
    });
  }
  if (auditValues.length > 0) {
    db.insert(schema.auditLogs).values(auditValues).run();
  }

  // Recurring templates + occurrences
  for (let t = 0; t < NUM_RECURRING_TEMPLATES; t++) {
    const isIncome = t < 3;
    const catId = isIncome ? randomItem(incomeCategoryIds) : randomItem(expenseCategoryIds);
    const startMonthIdx = t % 6;
    const startBm = BENCH_MONTHS[startMonthIdx];
    const dayOfMonth = (t % 28) + 1;
    const startDate = `${startBm.year}-${String(startBm.month).padStart(2, '0')}-01`;

    db.insert(schema.recurringTemplates)
      .values({
        id: templateIds[t],
        workspace_id: WORKSPACE_ID,
        created_by_user_id: USER_ID,
        name: `Recurring ${t + 1}`,
        type: isIncome ? 'income' : 'expense',
        amount: isIncome ? randomAmount(5_000_000, 20_000_000) : randomAmount(100_000, 5_000_000),
        currency: CURRENCY,
        category_id: catId,
        account_id: randomItem(accountIds),
        day_of_month: dayOfMonth,
        start_date: startDate,
        total_occurrences: 12,
        is_installment: t % 5 === 0,
        status: 'active',
        created_at: now,
        updated_at: now,
      })
      .run();

    for (let o = 0; o < Math.min(10, BENCH_MONTHS.length - startMonthIdx); o++) {
      const bm = BENCH_MONTHS[startMonthIdx + o];
      const dueDate = `${bm.year}-${String(bm.month).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
      const isPast = new Date(dueDate) < now;
      const status = isPast
        ? Math.random() < 0.6
          ? 'confirmed'
          : Math.random() < 0.5
            ? 'skipped'
            : 'pending'
        : 'pending';

      db.insert(schema.recurringOccurrences)
        .values({
          id: `occ-${nanoid(8)}`,
          template_id: templateIds[t],
          workspace_id: WORKSPACE_ID,
          due_date: dueDate,
          occurrence_number: o + 1,
          status,
          confirmed_at: status === 'confirmed' ? new Date(dueDate) : null,
          created_at: now,
          updated_at: now,
        })
        .run();
    }
  }
}

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

interface PerfResult {
  queryCount: number;
  durationMs: number;
}

async function measureWithPerf(fn: (perf: PerfCollector) => Promise<unknown>): Promise<PerfResult> {
  const perf = new PerfCollector();
  const start = performance.now();
  await fn(perf);
  const durationMs = performance.now() - start;
  return {
    queryCount: perf.getDbQueries().length,
    durationMs,
  };
}

function assertPerf(result: PerfResult, method: string) {
  const t = THRESHOLDS[method];
  recordResult(method, result.queryCount, result.durationMs);

  const qStr = t.maxQueries !== null ? `queries: ${result.queryCount} (max ${t.maxQueries}), ` : '';
  console.log(`  [${method}] ${qStr}time: ${result.durationMs.toFixed(1)}ms (max ${t.maxMs}ms)`);

  if (t.maxQueries !== null) {
    expect(result.queryCount).toBeLessThanOrEqual(t.maxQueries);
  }
  expect(result.durationMs).toBeLessThan(t.maxMs);
}

function assertTime(method: string, durationMs: number) {
  const t = THRESHOLDS[method];
  recordResult(method, null, durationMs);
  console.log(`  [${method}] time: ${durationMs.toFixed(1)}ms (max ${t.maxMs}ms)`);
  expect(durationMs).toBeLessThan(t.maxMs);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Performance Benchmark (real SQLite, ~10k transactions)', () => {
  // =======================================================================
  // ReportService
  // =======================================================================
  describe('ReportService', () => {
    it('getMonthlyReport', async () => {
      const period = `${TEST_MONTH.year}-${String(TEST_MONTH.month).padStart(2, '0')}`;
      const start = performance.now();
      const result = await reportService.getMonthlyReport(WORKSPACE_ID, period, CURRENCY, USER_ID);
      const durationMs = performance.now() - start;

      expect(result).toBeDefined();
      expect(result.trendData).toBeDefined();
      expect(result.expenseByCategory).toBeDefined();
      assertTime('ReportService.getMonthlyReport', durationMs);
    });

    it('getYearlyReport', async () => {
      const start = performance.now();
      const result = await reportService.getYearlyReport(
        WORKSPACE_ID,
        TEST_MONTH.year,
        CURRENCY,
        USER_ID
      );
      const durationMs = performance.now() - start;

      expect(result).toBeDefined();
      expect(result.trendData.length).toBeGreaterThan(0);
      assertTime('ReportService.getYearlyReport', durationMs);
    });

    it('getRecurringBreakdown', async () => {
      const start = performance.now();
      const result = await reportService.getRecurringBreakdown(
        WORKSPACE_ID,
        TEST_MONTH.year,
        TEST_MONTH.month,
        CURRENCY
      );
      const durationMs = performance.now() - start;

      expect(result).toBeDefined();
      assertTime('ReportService.getRecurringBreakdown', durationMs);
    });

    it('getMemberSummary', async () => {
      const period = `${TEST_MONTH.year}-${String(TEST_MONTH.month).padStart(2, '0')}`;
      const start = performance.now();
      const result = await reportService.getMemberSummary(
        WORKSPACE_ID,
        period,
        'monthly',
        CURRENCY
      );
      const durationMs = performance.now() - start;

      expect(result).toBeDefined();
      assertTime('ReportService.getMemberSummary', durationMs);
    });

    it('getCategoryTransactions', async () => {
      const period = `${TEST_MONTH.year}-${String(TEST_MONTH.month).padStart(2, '0')}`;
      const start = performance.now();
      const result = await reportService.getCategoryTransactions(
        WORKSPACE_ID,
        expenseCategoryIds[0],
        period,
        'monthly',
        CURRENCY
      );
      const durationMs = performance.now() - start;

      expect(result).toBeDefined();
      assertTime('ReportService.getCategoryTransactions', durationMs);
    });
  });

  // =======================================================================
  // TransactionService
  // =======================================================================
  describe('TransactionService', () => {
    it('getMonthSummary', async () => {
      const startDate = new Date(TEST_MONTH.year, TEST_MONTH.month - 1, 1);
      const endDate = new Date(TEST_MONTH.year, TEST_MONTH.month, 0, 23, 59, 59);
      const start = performance.now();
      const result = await transactionService.getMonthSummary({
        workspace_id: WORKSPACE_ID,
        currency: CURRENCY,
        start_date: startDate,
        end_date: endDate,
      });
      const durationMs = performance.now() - start;

      expect(result).toBeDefined();
      expect(typeof result.income).toBe('number');
      expect(typeof result.expenses).toBe('number');
      assertTime('TransactionService.getMonthSummary', durationMs);
    });

    it('findAll (paginated, 50 rows)', async () => {
      const result = await measureWithPerf(async (perf) => {
        return transactionService.findAll(
          { workspace_id: WORKSPACE_ID, currency: CURRENCY, limit: 50, offset: 0 },
          perf
        );
      });
      assertPerf(result, 'TransactionService.findAll');
    });

    it('findById', async () => {
      const result = await measureWithPerf(async (perf) => {
        return transactionService.findById(firstTxnId, WORKSPACE_ID, perf);
      });
      assertPerf(result, 'TransactionService.findById');
    });

    it('getTransactionsByAccount', async () => {
      const start = performance.now();
      const result = await transactionService.getTransactionsByAccount(
        accountIds[0],
        WORKSPACE_ID,
        TEST_MONTH.year,
        TEST_MONTH.month
      );
      const durationMs = performance.now() - start;

      expect(result).toBeDefined();
      assertTime('TransactionService.getTransactionsByAccount', durationMs);
    });

    it('getHistory', async () => {
      const start = performance.now();
      const result = await transactionService.getHistory(firstTxnId, WORKSPACE_ID);
      const durationMs = performance.now() - start;

      expect(result).toBeDefined();
      assertTime('TransactionService.getHistory', durationMs);
    });

    it('getCategoryUsageCounts', async () => {
      const start = performance.now();
      const result = await transactionService.getCategoryUsageCounts(WORKSPACE_ID, USER_ID, 90);
      const durationMs = performance.now() - start;

      expect(result).toBeDefined();
      assertTime('TransactionService.getCategoryUsageCounts', durationMs);
    });

    it('count', async () => {
      const result = await measureWithPerf(async (perf) => {
        return transactionService.count({ workspace_id: WORKSPACE_ID, currency: CURRENCY }, perf);
      });
      assertPerf(result, 'TransactionService.count');
    });
  });

  // =======================================================================
  // RecurringOccurrenceService
  // =======================================================================
  describe('RecurringOccurrenceService', () => {
    it('getStats', async () => {
      const start = performance.now();
      const result = await recurringOccurrenceService.getStats(WORKSPACE_ID);
      const durationMs = performance.now() - start;

      expect(result).toBeDefined();
      expect(typeof result.pendingCount).toBe('number');
      expect(typeof result.overdueCount).toBe('number');
      assertTime('RecurringOccurrenceService.getStats', durationMs);
    });

    it('findPending', async () => {
      const result = await measureWithPerf(async (perf) => {
        return recurringOccurrenceService.findPending(WORKSPACE_ID, {}, perf);
      });
      assertPerf(result, 'RecurringOccurrenceService.findPending');
    });

    it('getMonthlySummary', async () => {
      const monthKey = `${TEST_MONTH.year}-${String(TEST_MONTH.month).padStart(2, '0')}`;
      const start = performance.now();
      const result = await recurringOccurrenceService.getMonthlySummary(WORKSPACE_ID, monthKey);
      const durationMs = performance.now() - start;

      expect(result).toBeDefined();
      assertTime('RecurringOccurrenceService.getMonthlySummary', durationMs);
    });

    it('getCalendarData', async () => {
      const start = performance.now();
      const result = await recurringOccurrenceService.getCalendarData(
        WORKSPACE_ID,
        TEST_MONTH.year,
        TEST_MONTH.month
      );
      const durationMs = performance.now() - start;

      expect(result).toBeDefined();
      assertTime('RecurringOccurrenceService.getCalendarData', durationMs);
    });

    it('findByTemplate', async () => {
      const start = performance.now();
      const result = await recurringOccurrenceService.findByTemplate(templateIds[0], WORKSPACE_ID);
      const durationMs = performance.now() - start;

      expect(result).toBeDefined();
      assertTime('RecurringOccurrenceService.findByTemplate', durationMs);
    });
  });

  // =======================================================================
  // RecurringTemplateService
  // =======================================================================
  describe('RecurringTemplateService', () => {
    it('findAll', async () => {
      const result = await measureWithPerf(async (perf) => {
        return recurringTemplateService.findAll(WORKSPACE_ID, { limit: 20 }, perf);
      });
      assertPerf(result, 'RecurringTemplateService.findAll');
    });

    it('findById', async () => {
      const start = performance.now();
      const result = await recurringTemplateService.findById(templateIds[0], WORKSPACE_ID);
      const durationMs = performance.now() - start;

      expect(result).toBeDefined();
      assertTime('RecurringTemplateService.findById', durationMs);
    });

    it('hasTemplates', async () => {
      const start = performance.now();
      const result = await recurringTemplateService.hasTemplates(WORKSPACE_ID);
      const durationMs = performance.now() - start;

      expect(result).toBe(true);
      assertTime('RecurringTemplateService.hasTemplates', durationMs);
    });
  });

  // =======================================================================
  // AccountService
  // =======================================================================
  describe('AccountService', () => {
    it('getHistory', async () => {
      const result = await measureWithPerf(async (perf) => {
        return accountService.getHistory(accountIds[0], WORKSPACE_ID, perf);
      });
      assertPerf(result, 'AccountService.getHistory');
    });

    it('findAll', async () => {
      const result = await measureWithPerf(async (perf) => {
        return accountService.findAll(WORKSPACE_ID, {}, perf);
      });
      assertPerf(result, 'AccountService.findAll');
    });

    it('getTotalByCurrency', async () => {
      const result = await measureWithPerf(async (perf) => {
        return accountService.getTotalByCurrency(WORKSPACE_ID, perf);
      });
      assertPerf(result, 'AccountService.getTotalByCurrency');
    });

    it('getTotalByType', async () => {
      const result = await measureWithPerf(async (perf) => {
        return accountService.getTotalByType(WORKSPACE_ID, perf);
      });
      assertPerf(result, 'AccountService.getTotalByType');
    });

    it('getTotalByClass', async () => {
      const result = await measureWithPerf(async (perf) => {
        return accountService.getTotalByClass(WORKSPACE_ID, perf);
      });
      assertPerf(result, 'AccountService.getTotalByClass');
    });

    it('getSnapshotForMonth', async () => {
      const lastMonth = BENCH_MONTHS[BENCH_MONTHS.length - 1];
      const result = await measureWithPerf(async (perf) => {
        return accountService.getSnapshotForMonth(
          WORKSPACE_ID,
          lastMonth.year,
          lastMonth.month,
          {},
          perf
        );
      });
      assertPerf(result, 'AccountService.getSnapshotForMonth');
    });

    it('findById', async () => {
      const start = performance.now();
      const result = await accountService.findById(accountIds[0], WORKSPACE_ID);
      const durationMs = performance.now() - start;

      expect(result).toBeDefined();
      assertTime('AccountService.findById', durationMs);
    });

    it('findAllClosed', async () => {
      const result = await measureWithPerf(async (perf) => {
        return accountService.findAllClosed(WORKSPACE_ID, {}, perf);
      });
      assertPerf(result, 'AccountService.findAllClosed');
    });

    it('countClosed', async () => {
      const start = performance.now();
      const result = await accountService.countClosed(WORKSPACE_ID);
      const durationMs = performance.now() - start;

      expect(typeof result).toBe('number');
      assertTime('AccountService.countClosed', durationMs);
    });

    it('countByCategory', async () => {
      const start = performance.now();
      const result = await accountService.countByCategory(WORKSPACE_ID);
      const durationMs = performance.now() - start;

      expect(result).toBeDefined();
      assertTime('AccountService.countByCategory', durationMs);
    });

    it('findAllWithHistory', async () => {
      const result = await measureWithPerf(async (perf) => {
        return accountService.findAllWithHistory(WORKSPACE_ID, perf);
      });
      assertPerf(result, 'AccountService.findAllWithHistory');
    });

    it('getLastBalanceBefore', async () => {
      const start = performance.now();
      const result = await accountService.getLastBalanceBefore(
        accountIds[0],
        WORKSPACE_ID,
        TEST_MONTH.year,
        TEST_MONTH.month
      );
      const durationMs = performance.now() - start;

      expect(result).toBeDefined();
      assertTime('AccountService.getLastBalanceBefore', durationMs);
    });
  });

  // =======================================================================
  // BudgetService
  // =======================================================================
  describe('BudgetService', () => {
    it('getMonthlyOverview', async () => {
      const result = await measureWithPerf(async (perf) => {
        return budgetService.getMonthlyOverview(
          WORKSPACE_ID,
          TEST_MONTH.year,
          TEST_MONTH.month,
          CURRENCY,
          perf
        );
      });
      assertPerf(result, 'BudgetService.getMonthlyOverview');
    });

    it('getBudgetHistory (12mo)', async () => {
      const result = await measureWithPerf(async (perf) => {
        return budgetService.getBudgetHistory(WORKSPACE_ID, CURRENCY, 12, perf);
      });
      assertPerf(result, 'BudgetService.getBudgetHistory');
    });

    it('getCategoryTrends (6mo)', async () => {
      const result = await measureWithPerf(async (perf) => {
        return budgetService.getCategoryTrends(WORKSPACE_ID, CURRENCY, 6, perf);
      });
      assertPerf(result, 'BudgetService.getCategoryTrends');
    });

    it('getAlerts', async () => {
      const result = await measureWithPerf(async (perf) => {
        return budgetService.getAlerts(WORKSPACE_ID, CURRENCY, perf);
      });
      assertPerf(result, 'BudgetService.getAlerts');
    });

    it('findAllBudgets', async () => {
      const start = performance.now();
      const result = await budgetService.findAllBudgets(
        WORKSPACE_ID,
        TEST_MONTH.month,
        TEST_MONTH.year,
        CURRENCY
      );
      const durationMs = performance.now() - start;

      expect(result).toBeDefined();
      assertTime('BudgetService.findAllBudgets', durationMs);
    });

    it('getBudgetByCategory', async () => {
      const start = performance.now();
      const result = await budgetService.getBudgetByCategory(
        expenseCategoryIds[0],
        WORKSPACE_ID,
        TEST_MONTH.month,
        TEST_MONTH.year
      );
      const durationMs = performance.now() - start;

      // Result may be null if no budget exists for this category/month combo
      expect(result === null || typeof result === 'object').toBe(true);
      assertTime('BudgetService.getBudgetByCategory', durationMs);
    });

    it('hasBudgetsForMonth', async () => {
      const start = performance.now();
      const result = await budgetService.hasBudgetsForMonth(
        WORKSPACE_ID,
        TEST_MONTH.year,
        TEST_MONTH.month,
        CURRENCY
      );
      const durationMs = performance.now() - start;

      expect(typeof result).toBe('boolean');
      assertTime('BudgetService.hasBudgetsForMonth', durationMs);
    });
  });

  // =======================================================================
  // DashboardService
  // =======================================================================
  describe('DashboardService', () => {
    it('getDashboardData', async () => {
      const result = await measureWithPerf(async (perf) => {
        return dashboardService.getDashboardData(
          WORKSPACE_ID,
          TEST_MONTH.month,
          TEST_MONTH.year,
          CURRENCY,
          perf
        );
      });
      assertPerf(result, 'DashboardService.getDashboardData');
    });
  });

  // =======================================================================
  // CategoryService
  // =======================================================================
  describe('CategoryService', () => {
    it('findAll', async () => {
      const result = await measureWithPerf(async (perf) => {
        return categoryService.findAll(WORKSPACE_ID, {}, perf);
      });
      assertPerf(result, 'CategoryService.findAll');
    });

    it('findById', async () => {
      const result = await measureWithPerf(async (perf) => {
        return categoryService.findById(expenseCategoryIds[0], WORKSPACE_ID, perf);
      });
      assertPerf(result, 'CategoryService.findById');
    });
  });

  // =======================================================================
  // AccountCategoryService
  // =======================================================================
  describe('AccountCategoryService', () => {
    it('findAll', async () => {
      const start = performance.now();
      const result = await accountCategoryService.findAll(WORKSPACE_ID);
      const durationMs = performance.now() - start;

      expect(result).toBeDefined();
      assertTime('AccountCategoryService.findAll', durationMs);
    });
  });

  // =======================================================================
  // WorkspaceService
  // =======================================================================
  describe('WorkspaceService', () => {
    it('getOnboardingStatus', async () => {
      const start = performance.now();
      const result = await workspaceService.getOnboardingStatus(WORKSPACE_ID);
      const durationMs = performance.now() - start;

      expect(result).toBeDefined();
      assertTime('WorkspaceService.getOnboardingStatus', durationMs);
    });

    it('getMembers', async () => {
      const start = performance.now();
      const result = await workspaceService.getMembers(WORKSPACE_ID);
      const durationMs = performance.now() - start;

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(2);
      assertTime('WorkspaceService.getMembers', durationMs);
    });
  });

  // =======================================================================
  // UserService
  // =======================================================================
  describe('UserService', () => {
    it('getById', async () => {
      const start = performance.now();
      const result = await userService.getById(USER_ID);
      const durationMs = performance.now() - start;

      expect(result).toBeDefined();
      assertTime('UserService.getById', durationMs);
    });
  });
});
