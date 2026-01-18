/**
 * Dashboard Service Integration Tests
 * ===================================
 *
 * End-to-end integration tests for dashboard service with real database.
 * These tests verify that the dashboard service works correctly with
 * seeded data from the database seeder.
 *
 * Prerequisites:
 * - Database must be seeded with test data (run `bun run db:seed:dashboard`)
 * - Database connection must be available
 *
 * Usage: bun test src/services/dashboard.service.integration.test.ts
 */

/* eslint-disable no-console -- Console output is intentional for test progress feedback */

import { describe, it, expect, beforeAll } from 'bun:test';
import { DashboardService } from './dashboard.service';
import { db } from '@/db';
import { users, transactions, assets, categories } from '@/db';
import { eq } from 'drizzle-orm';

// Test user credentials (must match the seeder)
const TEST_USER = {
  email: 'test@example.com',
  password: 'Test12345678!',
  name: 'Test User',
};

// Expected values based on the seeder configuration
// These values match what's in src/db/seeders/dashboard-seeder.ts
const EXPECTED = {
  // Income categories
  incomeCategories: ['Salary', 'Freelance', 'Investment Returns'],
  // Expense categories with their budgets
  expenseCategories: [
    { name: 'Food', budget: 5000000 },
    { name: 'Transport', budget: 2000000 },
    { name: 'Housing', budget: 10000000 },
    { name: 'Utilities', budget: 1500000 },
    { name: 'Entertainment', budget: 2000000 },
    { name: 'Healthcare', budget: 1000000 },
    { name: 'Shopping', budget: 3000000 },
    { name: 'Education', budget: 1500000 },
  ],
  // Assets with their balances
  assets: [
    { name: 'BCA Checking', balance: 25000000 },
    { name: 'Mandiri Savings', balance: 45000000 },
    { name: 'Reksa Dana Schroder', balance: 35000000 },
    { name: 'Stock - BBCA', balance: 22000000 },
    { name: 'Bitcoin', balance: 18000000 },
    { name: 'Cash on Hand', balance: 5000000 },
  ],
  // Expected total budget
  totalBudget: 5000000 + 2000000 + 10000000 + 1500000 + 2000000 + 1000000 + 3000000 + 1500000, // 26,000,000 IDR
  // Expected total assets
  totalAssets: 25000000 + 45000000 + 35000000 + 22000000 + 18000000 + 5000000, // 150,000,000 IDR
  // Expected monthly salary
  monthlySalary: 20000000,
};

describe('DashboardService Integration Tests', () => {
  let dashboardService: DashboardService;
  let testUserId: string;

  beforeAll(async () => {
    dashboardService = new DashboardService(db);

    // Get the test user from database
    const user = await db.query.users.findFirst({
      where: eq(users.email, TEST_USER.email),
    });

    if (!user) {
      throw new Error(`Test user not found. Please run 'bun run db:seed:dashboard' first.`);
    }

    testUserId = user.id;
    console.log(`Integration test using test user: ${user.name} (${user.email})`);
  });

  describe('getTotalAssets', () => {
    it('should return total assets by currency (IDR)', async () => {
      const result = await dashboardService.getTotalAssets(testUserId, 'IDR');

      // Verify structure
      expect(result).toHaveProperty('idr');
      expect(result).toHaveProperty('usd');
      expect(result).toHaveProperty('converted');
      expect(result).toHaveProperty('convertedCurrency');

      // Verify primary currency
      expect(result.convertedCurrency).toBe('IDR');

      // All seeded assets are in IDR
      expect(result.idr).toBe(EXPECTED.totalAssets.toString());
      expect(result.usd).toBe('0');

      // Converted total should match IDR total since all assets are IDR
      expect(result.converted).toBe(EXPECTED.totalAssets.toString());
    });

    it('should return total assets with USD conversion', async () => {
      const result = await dashboardService.getTotalAssets(testUserId, 'USD');

      expect(result.convertedCurrency).toBe('USD');

      // IDR total should be the seeded amount
      expect(result.idr).toBe(EXPECTED.totalAssets.toString());

      // USD converted should be a reasonable value (~$9,677 based on ~15,500 rate)
      const convertedAmount = parseFloat(result.converted);
      expect(convertedAmount).toBeGreaterThan(8000);
      expect(convertedAmount).toBeLessThan(12000);
    });

    it('should sum all asset balances correctly', async () => {
      const result = await dashboardService.getTotalAssets(testUserId);

      // Verify each seeded asset is accounted for
      const dbAssets = await db.query.assets.findMany({
        where: eq(assets.user_id, testUserId),
      });

      // Count assets
      expect(dbAssets.length).toBe(EXPECTED.assets.length);

      // Sum and verify
      let expectedTotal = 0;
      for (const asset of dbAssets) {
        expectedTotal += parseFloat(asset.balance);
      }

      expect(parseFloat(result.idr)).toBe(expectedTotal);
    });
  });

  describe('getMonthlySpent', () => {
    it('should return total spending for the current month', async () => {
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
      // Note: budget is returned as a number, not a string
      expect(String(result.budget)).toBe(EXPECTED.totalBudget.toString());

      // Total should be greater than 0 (there are transactions)
      expect(parseFloat(result.total)).toBeGreaterThan(0);

      // Percentage should be calculated correctly
      const expectedPercentage = (parseFloat(result.total) / parseFloat(result.budget)) * 100;
      expect(Math.abs(result.percentage - expectedPercentage)).toBeLessThan(0.1);

      // Remaining should be budget - total
      const expectedRemaining = parseFloat(result.budget) - parseFloat(result.total);
      expect(Math.abs(parseFloat(result.remaining) - expectedRemaining)).toBeLessThan(0.01);
    });

    it('should return total spending for a specific month', async () => {
      // Test with a month that has transactions (within the 90-day seeding window)
      const now = new Date();
      const testDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      const result = await dashboardService.getMonthlySpent(
        testUserId,
        testDate.getMonth() + 1,
        testDate.getFullYear()
      );

      // Should have spending data
      expect(parseFloat(result.total)).toBeGreaterThan(0);
      expect(parseFloat(result.budget)).toBe(EXPECTED.totalBudget);
    });

    it('should handle months with no transactions', async () => {
      // Test with a date far in the past (before the 90-day seeding window)
      const result = await dashboardService.getMonthlySpent(testUserId, 1, 2020);

      expect(result.total).toBe('0');
      expect(result.percentage).toBe(0);
      // Budget/remaining may be string or number depending on error handling path
      expect(parseFloat(result.remaining)).toBeCloseTo(EXPECTED.totalBudget, 0);
    });

    it('should handle invalid month parameter gracefully', async () => {
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

    it('should handle invalid year parameter gracefully', async () => {
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

  describe('getBudgetHealth', () => {
    it('should return budget health with alerts', async () => {
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

    it('should include correct alert structure for each category', async () => {
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

        // Verify the category exists in our expected categories
        const categoryExists = EXPECTED.expenseCategories.some((c) => c.name === alert.category);
        expect(categoryExists).toBe(true);
      }
    });

    it('should calculate budget status correctly', async () => {
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

    it('should handle months with no spending', async () => {
      const result = await dashboardService.getBudgetHealth(testUserId, 1, 2020);

      expect(result.alertCount).toBe(0);
      expect(result.status).toBe('healthy');
      expect(result.alerts).toHaveLength(0);
    });
  });

  describe('getAssetUpdateReminders', () => {
    it('should return assets that need updating', async () => {
      const result = await dashboardService.getAssetUpdateReminders(testUserId);

      expect(Array.isArray(result)).toBe(true);

      // All assets are seeded with random ages (0-60 days)
      // Some should be older than 7 days and need updates
      if (result.length > 0) {
        // Check structure of each reminder
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

          // Verify the asset exists in our seeded assets
          const assetExists = EXPECTED.assets.some((a) => a.name === reminder.assetName);
          expect(assetExists).toBe(true);
        }
      }
    });

    it('should sort reminders by priority (high to low)', async () => {
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

    it('should not include recently updated assets', async () => {
      const result = await dashboardService.getAssetUpdateReminders(testUserId);

      // All returned assets should have daysSinceUpdate > 7
      for (const reminder of result) {
        expect(reminder.daysSinceUpdate).toBeGreaterThan(7);
      }
    });
  });

  describe('getRecentTransactions', () => {
    it('should return recent transactions', async () => {
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
        expect(tx).toHaveProperty('paymentMethod');

        expect(['expense', 'income']).toContain(tx.type);
        expect(['IDR', 'USD']).toContain(tx.currency);
      }
    });

    it('should sort by transaction date descending', async () => {
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

    it('should respect limit parameter', async () => {
      const result3 = await dashboardService.getRecentTransactions(testUserId, 3);
      expect(result3.length).toBeLessThanOrEqual(3);

      const result10 = await dashboardService.getRecentTransactions(testUserId, 10);
      expect(result10.length).toBeLessThanOrEqual(10);
    });

    it('should use default limit of 5', async () => {
      const result = await dashboardService.getRecentTransactions(testUserId);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should handle invalid limit parameter gracefully', async () => {
      // Dashboard service returns empty array on error instead of throwing
      const result1 = await dashboardService.getRecentTransactions(testUserId, 0);
      expect(Array.isArray(result1)).toBe(true);

      const result2 = await dashboardService.getRecentTransactions(testUserId, 101);
      expect(Array.isArray(result2)).toBe(true);
    });
  });

  describe('getDashboardData', () => {
    it('should return complete dashboard data', async () => {
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

    it('should use current month and year by default', async () => {
      const result = await dashboardService.getDashboardData(testUserId);
      expect(result.monthlySpent).toBeDefined();
      expect(result.budgetHealth).toBeDefined();
    });

    it('should accept custom month and year', async () => {
      const result = await dashboardService.getDashboardData(testUserId, 6, 2024);

      expect(result).toBeDefined();
      expect(result.monthlySpent).toBeDefined();
      expect(result.budgetHealth).toBeDefined();
    });

    it('should accept custom currency', async () => {
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

    it('should return consistent data across all dashboard sections', async () => {
      const now = new Date();
      const result = await dashboardService.getDashboardData(
        testUserId,
        now.getMonth() + 1,
        now.getFullYear()
      );

      // Total assets should match what we expect
      expect(parseFloat(result.totalAssets.idr)).toBe(EXPECTED.totalAssets);

      // Budget in monthlySpent should match total expense category budgets
      expect(parseFloat(result.monthlySpent.budget)).toBe(EXPECTED.totalBudget);

      // Budget health alert count should match the length of alerts array
      expect(result.budgetHealth.alertCount).toBe(result.budgetHealth.alerts.length);

      // Recent transactions should be limited to 5
      expect(result.recentTransactions.length).toBeLessThanOrEqual(5);

      // All asset reminders should have priority levels
      for (const reminder of result.assetReminders) {
        expect(['high', 'medium', 'low']).toContain(reminder.priority);
      }
    });
  });

  describe('Data Consistency', () => {
    it('should have consistent transaction counts', async () => {
      // Verify we have transactions in the database
      const dbTransactions = await db.query.transactions.findMany({
        where: eq(transactions.user_id, testUserId),
        limit: 10,
      });

      // Should have transactions
      expect(dbTransactions.length).toBeGreaterThan(0);
    });

    it('should have consistent asset data', async () => {
      // Get assets from database
      const dbAssets = await db.query.assets.findMany({
        where: eq(assets.user_id, testUserId),
      });

      // Should have all seeded assets
      expect(dbAssets.length).toBe(EXPECTED.assets.length);

      // Verify names match
      const dbAssetNames = dbAssets.map((a) => a.name).sort();
      const expectedAssetNames = EXPECTED.assets.map((a) => a.name).sort();
      expect(dbAssetNames).toEqual(expectedAssetNames);
    });

    it('should have consistent category data', async () => {
      // Get categories from database
      const dbCategories = await db.query.categories.findMany({
        where: eq(categories.user_id, testUserId),
      });

      // Should have all seeded categories
      const expectedTotal = EXPECTED.incomeCategories.length + EXPECTED.expenseCategories.length;
      expect(dbCategories.length).toBe(expectedTotal);
    });

    it('should verify exchange rate data exists', async () => {
      // The dashboard service needs exchange rates for currency conversion
      // This test verifies that exchange rates were seeded correctly

      const result = await dashboardService.getTotalAssets(testUserId, 'USD');

      // If conversion works, exchange rates must exist
      expect(parseFloat(result.converted)).toBeGreaterThan(0);
    });
  });
});
