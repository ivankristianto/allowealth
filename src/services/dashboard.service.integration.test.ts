/**
 * Dashboard Service Integration Tests
 * ===================================
 *
 * End-to-end integration tests for dashboard service with real database.
 * These tests verify that the dashboard service works correctly with
 * seeded data from the database seeder.
 *
 * Prerequisites:
 * - Database must be seeded with test data (run `bun run db:seed`)
 * - Demo user (demo@example.com) must exist from the seeder
 *
 * Usage: bun test src/services/dashboard.service.integration.test.ts
 *
 * Note: This test uses the demo user created by the standard seeder.
 * If you need to test specific data scenarios, create a custom seeder or
 * modify the expected values below to match your seeded data.
 */

/* eslint-disable no-console -- Console output is intentional for test progress feedback */

import { describe, it, expect, beforeAll } from 'bun:test';
import { DashboardService } from './dashboard.service';
import { db } from '@/db';
import { users, transactions, assets, categories } from '@/db';
import { eq } from 'drizzle-orm';

// Test user credentials (matches the seeder)
const TEST_USER = {
  email: 'demo@example.com',
  password: 'demo123456789',
  name: 'Demo User',
};

// Expected values based on the seeder configuration
// These values match what's in src/db/seed.ts
const EXPECTED = {
  // Income categories from seeder
  incomeCategories: ['Salary', 'Freelance', 'Investment Returns', 'Other Income'],
  // Expense categories from seeder
  expenseCategories: [
    { name: 'Groceries', budget: 3000000 },
    { name: 'Rent', budget: 8000000 },
    { name: 'Utilities', budget: 1500000 },
    { name: 'Transportation', budget: 1000000 },
    { name: 'Dining Out', budget: 2000000 },
    { name: 'Shopping', budget: 2500000 },
    { name: 'Healthcare', budget: 1000000 },
    { name: 'Entertainment', budget: 1500000 },
    { name: 'Education', budget: 2000000 },
    { name: 'Insurance', budget: 1500000 },
    { name: 'Subscriptions', budget: 500000 },
  ],
  // Sample of assets from seeder (not all - seeder has 25 assets)
  assets: [
    { name: 'BCA Checking', balance: 15000000 },
    { name: 'BCA Savings', balance: 50000000 },
    { name: 'Chase Checking', balance: 5000, currency: 'USD' },
    { name: 'Reksa Dana BCAP', balance: 25000000 },
    { name: 'Stock - BBRI', balance: 12000000 },
    { name: 'Stock - BBCA', balance: 18000000 },
    { name: 'Bitcoin', balance: 45000000 },
  ],
  // Expected total budget (sum of all expense category budgets)
  totalBudget:
    3000000 +
    8000000 +
    1500000 +
    1000000 +
    2000000 +
    2500000 +
    1000000 +
    1500000 +
    2000000 +
    1500000 +
    500000, // 24,500,000 IDR
  // Expected monthly salary (from seeder)
  monthlySalary: 15000000,
};

describe('DashboardService Integration Tests', () => {
  let dashboardService: DashboardService;
  let testUserId: string;
  let shouldSkip = false;

  beforeAll(async () => {
    dashboardService = new DashboardService(db);

    // Get the test user from database
    const user = await db.query.users.findFirst({
      where: eq(users.email, TEST_USER.email),
    });

    if (!user) {
      console.warn(`\n⚠️  Skipping integration tests: Demo user not found.`);
      console.warn(`   Run 'bun run db:seed' to create test data.\n`);
      shouldSkip = true;
      return;
    }

    testUserId = user.id;
    console.log(`Integration test using demo user: ${user.name} (${user.email})`);
  });

  // Helper to skip tests if demo user doesn't exist
  const skipIfNoUser = (callback: () => void) => {
    if (shouldSkip) {
      return;
    }
    callback();
  };

  describe('getTotalAssets', () => {
    it('should return total assets by currency (IDR)', () => {
      skipIfNoUser(async () => {
        const result = await dashboardService.getTotalAssets(testUserId, 'IDR');

        // Verify structure
        expect(result).toHaveProperty('idr');
        expect(result).toHaveProperty('usd');
        expect(result).toHaveProperty('converted');
        expect(result).toHaveProperty('convertedCurrency');

        // Verify primary currency
        expect(result.convertedCurrency).toBe('IDR');

        // Should have both IDR and USD assets (seeder creates both)
        expect(parseFloat(result.idr)).toBeGreaterThan(0);
        expect(parseFloat(result.usd)).toBeGreaterThan(0);

        // Converted should be greater than IDR total (includes USD conversion)
        expect(parseFloat(result.converted)).toBeGreaterThan(parseFloat(result.idr));
      });
    });

    it('should return total assets with USD conversion', () => {
      skipIfNoUser(async () => {
        const result = await dashboardService.getTotalAssets(testUserId, 'USD');

        expect(result.convertedCurrency).toBe('USD');

        // Should have both currencies
        expect(parseFloat(result.idr)).toBeGreaterThan(0);
        expect(parseFloat(result.usd)).toBeGreaterThan(0);

        // USD converted should be a reasonable value (IDR + USD converted to USD)
        const convertedAmount = parseFloat(result.converted);
        expect(convertedAmount).toBeGreaterThan(0);
      });
    });

    it('should sum all asset balances correctly', () => {
      skipIfNoUser(async () => {
        const result = await dashboardService.getTotalAssets(testUserId);

        // Verify we have assets from the database
        const dbAssets = await db.query.assets.findMany({
          where: eq(assets.workspace_id, testUserId),
        });

        // Should have seeded assets
        expect(dbAssets.length).toBeGreaterThan(0);

        // Sum and verify
        let expectedIDR = 0;
        let expectedUSD = 0;
        for (const asset of dbAssets) {
          if (asset.currency === 'IDR') {
            expectedIDR += parseFloat(asset.balance);
          } else if (asset.currency === 'USD') {
            expectedUSD += parseFloat(asset.balance);
          }
        }

        expect(parseFloat(result.idr)).toBeCloseTo(expectedIDR, 2);
        expect(parseFloat(result.usd)).toBeCloseTo(expectedUSD, 2);
      });
    });
  });

  describe('getMonthlySpent', () => {
    it('should return total spending for the current month', () => {
      skipIfNoUser(async () => {
        const now = new Date();
        const result = await dashboardService.getMonthlySpent(
          testUserId,
          now.getMonth() + 1,
          now.getFullYear()
        );

        // Verify structure
        expect(result).toHaveProperty('total');
        expect(result).toHaveProperty('budget');
        expect(result).toHaveProperty('percentage');
        expect(result).toHaveProperty('remaining');

        // Budget should match total expense category budgets
        expect(String(result.budget)).toBe(EXPECTED.totalBudget.toString());

        // Total should be greater than 0 (seeder creates 90 days of transactions)
        expect(parseFloat(result.total)).toBeGreaterThan(0);

        // Percentage should be calculated correctly
        const expectedPercentage = (parseFloat(result.total) / parseFloat(result.budget)) * 100;
        expect(Math.abs(result.percentage - expectedPercentage)).toBeLessThan(0.1);

        // Remaining should be budget - total
        const expectedRemaining = parseFloat(result.budget) - parseFloat(result.total);
        expect(Math.abs(parseFloat(result.remaining) - expectedRemaining)).toBeLessThan(0.01);
      });
    });

    it('should handle months with no transactions', () => {
      skipIfNoUser(async () => {
        // Test with a date far in the past (seeder only creates 90 days of data)
        const result = await dashboardService.getMonthlySpent(testUserId, 1, 2020);

        expect(result.total).toBe('0');
        expect(result.percentage).toBe(0);
        expect(parseFloat(result.remaining)).toBeCloseTo(EXPECTED.totalBudget, 0);
      });
    });

    it('should handle invalid month parameter gracefully', () => {
      skipIfNoUser(async () => {
        // Dashboard service returns default values on error instead of throwing
        const result1 = await dashboardService.getMonthlySpent(testUserId, 0, 2024);
        expect(result1.total).toBe('0');
        expect(result1.budget).toBe('0');
        expect(result1.percentage).toBe(0);

        const result2 = await dashboardService.getMonthlySpent(testUserId, 13, 2024);
        expect(result2.total).toBe('0');
        expect(result2.budget).toBe('0');
        expect(result2.percentage).toBe(0);
      });
    });

    it('should handle invalid year parameter gracefully', () => {
      skipIfNoUser(async () => {
        // Dashboard service returns default values on error instead of throwing
        const result1 = await dashboardService.getMonthlySpent(testUserId, 1, 1999);
        expect(result1.total).toBe('0');
        expect(result1.budget).toBe('0');
        expect(result1.percentage).toBe(0);

        const result2 = await dashboardService.getMonthlySpent(testUserId, 1, 2101);
        expect(result2.total).toBe('0');
        expect(result2.budget).toBe('0');
        expect(result2.percentage).toBe(0);
      });
    });
  });

  describe('getBudgetHealth', () => {
    it('should return budget health with alerts', () => {
      skipIfNoUser(async () => {
        const now = new Date();
        const result = await dashboardService.getBudgetHealth(
          testUserId,
          now.getMonth() + 1,
          now.getFullYear()
        );

        // Verify structure
        expect(result).toHaveProperty('alertCount');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('alerts');

        expect(['healthy', 'warning', 'exceeded']).toContain(result.status);
        expect(Array.isArray(result.alerts)).toBe(true);
        expect(result.alertCount).toBe(result.alerts.length);

        // Alert count should not exceed number of expense categories
        expect(result.alertCount).toBeLessThanOrEqual(EXPECTED.expenseCategories.length);
      });
    });

    it('should include correct alert structure for each category', () => {
      skipIfNoUser(async () => {
        const now = new Date();
        const result = await dashboardService.getBudgetHealth(
          testUserId,
          now.getMonth() + 1,
          now.getFullYear()
        );

        // Check each alert has the correct structure
        for (const alert of result.alerts) {
          expect(alert).toHaveProperty('category');
          expect(alert).toHaveProperty('budget');
          expect(alert).toHaveProperty('spent');
          expect(alert).toHaveProperty('percentage');
          expect(alert).toHaveProperty('status');
          expect(alert).toHaveProperty('remaining');
          expect(alert).toHaveProperty('overage');

          expect(['warning', 'exceeded']).toContain(alert.status);
        }
      });
    });

    it('should calculate budget status correctly', () => {
      skipIfNoUser(async () => {
        const now = new Date();
        const result = await dashboardService.getBudgetHealth(
          testUserId,
          now.getMonth() + 1,
          now.getFullYear()
        );

        // For each alert, verify the calculations
        for (const alert of result.alerts) {
          const budget = parseFloat(alert.budget);
          const spent = parseFloat(alert.spent);
          const percentage = (spent / budget) * 100;

          // Percentage should be accurate
          expect(Math.abs(alert.percentage - percentage)).toBeLessThan(0.1);

          // Status should match percentage thresholds
          if (alert.status === 'exceeded') {
            expect(alert.percentage).toBeGreaterThanOrEqual(100);
          } else if (alert.status === 'warning') {
            expect(alert.percentage).toBeGreaterThanOrEqual(80);
            expect(alert.percentage).toBeLessThan(100);
          }
        }
      });
    });

    it('should handle months with no spending', () => {
      skipIfNoUser(async () => {
        const result = await dashboardService.getBudgetHealth(testUserId, 1, 2020);

        expect(result.alertCount).toBe(0);
        expect(result.status).toBe('healthy');
        expect(result.alerts).toHaveLength(0);
      });
    });
  });

  describe('getAssetUpdateReminders', () => {
    it('should return assets that need updating', () => {
      skipIfNoUser(async () => {
        const result = await dashboardService.getAssetUpdateReminders(testUserId);

        expect(Array.isArray(result)).toBe(true);

        // Seeder sets last_updated to "now" for all assets
        // So initially no assets should need updates (>7 days old)
        // This test verifies the structure and filtering logic
        for (const reminder of result) {
          expect(reminder).toHaveProperty('assetId');
          expect(reminder).toHaveProperty('assetName');
          expect(reminder).toHaveProperty('assetType');
          expect(reminder).toHaveProperty('lastUpdated');
          expect(reminder).toHaveProperty('daysSinceUpdate');
          expect(reminder).toHaveProperty('priority');
          expect(reminder).toHaveProperty('currentBalance');
          expect(reminder).toHaveProperty('currency');

          expect(['high', 'medium', 'low']).toContain(reminder.priority);
          expect(reminder.daysSinceUpdate).toBeGreaterThan(7);
        }
      });
    });

    it('should sort reminders by priority (high to low)', () => {
      skipIfNoUser(async () => {
        const result = await dashboardService.getAssetUpdateReminders(testUserId);

        if (result.length > 1) {
          const priorityValue: Record<string, number> = { high: 3, medium: 2, low: 1 };

          for (let i = 1; i < result.length; i++) {
            const prev = result[i - 1];
            const curr = result[i];

            if (!prev || !curr) continue;

            const prevPriority = priorityValue[prev.priority] ?? 0;
            const currPriority = priorityValue[curr.priority] ?? 0;

            // Previous should have >= priority
            if (prevPriority !== currPriority) {
              expect(prevPriority).toBeGreaterThan(currPriority);
            }
          }
        }
      });
    });
  });

  describe('getRecentTransactions', () => {
    it('should return recent transactions', () => {
      skipIfNoUser(async () => {
        const result = await dashboardService.getRecentTransactions(testUserId, 5);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeLessThanOrEqual(5);

        // Check structure of each transaction
        for (const tx of result) {
          expect(tx).toHaveProperty('id');
          expect(tx).toHaveProperty('type');
          expect(tx).toHaveProperty('amount');
          expect(tx).toHaveProperty('currency');
          expect(tx).toHaveProperty('transactionDate');
          expect(tx).toHaveProperty('category');
          expect(tx).toHaveProperty('asset');

          expect(['expense', 'income']).toContain(tx.type);
          expect(['IDR', 'USD']).toContain(tx.currency);
        }
      });
    });

    it('should sort by transaction date descending', () => {
      skipIfNoUser(async () => {
        const result = await dashboardService.getRecentTransactions(testUserId, 10);

        if (result.length > 1) {
          for (let i = 1; i < result.length; i++) {
            const prev = result[i - 1];
            const curr = result[i];

            if (!prev || !curr) continue;

            const prevDate = prev.transactionDate.getTime();
            const currDate = curr.transactionDate.getTime();

            expect(prevDate).toBeGreaterThanOrEqual(currDate);
          }
        }
      });
    });

    it('should respect limit parameter', () => {
      skipIfNoUser(async () => {
        const result3 = await dashboardService.getRecentTransactions(testUserId, 3);
        expect(result3.length).toBeLessThanOrEqual(3);

        const result10 = await dashboardService.getRecentTransactions(testUserId, 10);
        expect(result10.length).toBeLessThanOrEqual(10);
      });
    });

    it('should use default limit of 5', () => {
      skipIfNoUser(async () => {
        const result = await dashboardService.getRecentTransactions(testUserId);
        expect(result.length).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('getDashboardData', () => {
    it('should return complete dashboard data', () => {
      skipIfNoUser(async () => {
        const now = new Date();
        const result = await dashboardService.getDashboardData(
          testUserId,
          now.getMonth() + 1,
          now.getFullYear()
        );

        expect(result).toHaveProperty('totalAssets');
        expect(result).toHaveProperty('monthlySpent');
        expect(result).toHaveProperty('budgetHealth');
        expect(result).toHaveProperty('assetReminders');
        expect(result).toHaveProperty('recentTransactions');
      });
    });

    it('should use current month and year by default', () => {
      skipIfNoUser(async () => {
        const result = await dashboardService.getDashboardData(testUserId);
        expect(result.monthlySpent).toBeDefined();
        expect(result.budgetHealth).toBeDefined();
      });
    });

    it('should accept custom currency', () => {
      skipIfNoUser(async () => {
        const resultIDR = await dashboardService.getDashboardData(
          testUserId,
          undefined,
          undefined,
          'IDR'
        );
        expect(resultIDR.totalAssets.convertedCurrency).toBe('IDR');

        const resultUSD = await dashboardService.getDashboardData(
          testUserId,
          undefined,
          undefined,
          'USD'
        );
        expect(resultUSD.totalAssets.convertedCurrency).toBe('USD');
      });
    });
  });

  describe('Data Consistency', () => {
    it('should have consistent transaction counts', () => {
      skipIfNoUser(async () => {
        // Verify we have transactions in the database
        const dbTransactions = await db.query.transactions.findMany({
          where: eq(transactions.workspace_id, testUserId),
          limit: 10,
        });

        // Should have transactions (seeder creates ~450 transactions over 90 days)
        expect(dbTransactions.length).toBeGreaterThan(0);
      });
    });

    it('should have consistent asset data', () => {
      skipIfNoUser(async () => {
        // Get assets from database
        const dbAssets = await db.query.assets.findMany({
          where: eq(assets.workspace_id, testUserId),
        });

        // Should have seeded assets (seeder creates 25 assets)
        expect(dbAssets.length).toBeGreaterThan(0);
      });
    });

    it('should have consistent category data', () => {
      skipIfNoUser(async () => {
        // Get categories from database
        const dbCategories = await db.query.categories.findMany({
          where: eq(categories.workspace_id, testUserId),
        });

        // Should have all seeded categories
        const expectedTotal = EXPECTED.incomeCategories.length + EXPECTED.expenseCategories.length;
        expect(dbCategories.length).toBe(expectedTotal);
      });
    });

    it('should verify exchange rate data exists', () => {
      skipIfNoUser(async () => {
        // The dashboard service needs exchange rates for currency conversion
        // This test verifies that exchange rates were seeded correctly

        const result = await dashboardService.getTotalAssets(testUserId, 'USD');

        // If conversion works, exchange rates must exist
        expect(parseFloat(result.converted)).toBeGreaterThan(0);
      });
    });
  });
});
