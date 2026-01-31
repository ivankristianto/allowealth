/**
 * Budget Remaining API Integration Tests
 * =====================================
 *
 * Integration tests for budget remaining GET endpoint with real database.
 * Tests budget remaining calculations, warning thresholds, and error displays.
 *
 * Prerequisites:
 * - Database must be seeded with test data (run `bun run db:seed`)
 * - Demo user (demo@example.com) must exist from the seeder
 *
 * Usage: bun test src/pages/api/budget/category/budget-remaining.api.integration.test.ts
 */

/* eslint-disable no-console -- Console output is intentional for test progress feedback */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { db } from '@/db';
import { workspaces, users, categories, transactions, assets, budgets } from '@/db';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth/lucia';
import { nanoid } from 'nanoid';

// Test workspace for isolation tests
const TEST_WORKSPACE_ID = 'test-workspace-budget-isolation';

// Test user credentials (matches the seeder)
const TEST_USER = {
  email: 'demo@example.com',
  password: 'demo123456789',
  name: 'Demo User',
};

describe('Budget Remaining API Integration Tests', () => {
  let testUserId: string;
  let sessionId: string;
  let testCategoryId: string;
  let testAssetId: string;
  let shouldSkip = false;

  beforeAll(async () => {
    // Get the test user from database
    const user = await db.query.users.findFirst({
      where: eq(users.email, TEST_USER.email),
    });

    if (!user) {
      console.warn(`\n⚠️  Skipping API integration tests: Demo user not found.`);
      console.warn(`   Run 'bun run db:seed' to create test data.\n`);
      shouldSkip = true;
      return;
    }

    testUserId = user.id;
    console.log(`API integration test using demo user: ${user.name} (${user.email})`);

    // Create a session for authentication
    const session = await auth.createSession(testUserId, {});
    sessionId = session.id;

    // Create a test asset
    const [asset] = await db
      .insert(assets)
      .values({
        id: nanoid(),
        user_id: testUserId,
        name: `Test Asset ${Date.now()}`,
        type: 'cash',
        currency: 'IDR',
        balance: '1000000',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    testAssetId = asset.id;

    // Create a test category
    const [category] = await db
      .insert(categories)
      .values({
        id: nanoid(),
        user_id: testUserId,
        name: `Test Budget Remaining ${Date.now()}`,
        type: 'expense',
        icon: 'tag',
        color: 'bg-neutral',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    testCategoryId = category.id;

    // Create a budget for this category in current month
    const now = new Date();
    await db.insert(budgets).values({
      id: nanoid(),
      user_id: testUserId,
      category_id: testCategoryId,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      budget_amount: '1000000', // 1 million IDR
      currency: 'IDR',
      is_closed: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    console.log(`Created test category: ${category.name} (ID: ${category.id})`);
  });

  // Helper to skip tests if demo user doesn't exist
  const skipIfNoUser = (callback: () => void) => {
    if (shouldSkip) {
      return;
    }
    callback();
  };

  // Helper to make authenticated API requests
  const makeRequest = async (
    endpoint: string,
    method: string = 'GET',
    body?: Record<string, unknown>
  ): Promise<Response> => {
    const url = new URL(endpoint, 'http://localhost:4321');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Cookie: `sid=${sessionId}`,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    return fetch(url.toString(), options);
  };

  // Helper to create a transaction for the current month
  const createTransaction = async (amount: string) => {
    const now = new Date();
    await db.insert(transactions).values({
      id: nanoid(),
      user_id: testUserId,
      category_id: testCategoryId,
      asset_id: testAssetId,
      type: 'expense',
      amount,
      currency: 'IDR',
      transaction_date: now,
      description: `Test transaction ${Date.now()}`,
      created_at: new Date(),
      updated_at: new Date(),
    });
  };

  // Helper to clean up all transactions for test category
  const cleanupTransactions = async () => {
    await db
      .delete(transactions)
      .where(
        and(eq(transactions.category_id, testCategoryId), eq(transactions.user_id, testUserId))
      );
  };

  describe('GET /api/budget/category/:id/remaining', () => {
    it('should return budget remaining with no transactions (100% remaining)', async () => {
      skipIfNoUser(async () => {
        await cleanupTransactions();

        const response = await makeRequest(
          `/api/budget/category/${testCategoryId}/remaining?currency=IDR`,
          'GET'
        );

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data).toMatchObject({
          category_id: testCategoryId,
          budget_amount: '1000000',
          spent_amount: '0',
          remaining: '1000000',
          percentage_used: '0',
        });
      });
    });

    it('should calculate remaining correctly with 50% spent', async () => {
      skipIfNoUser(async () => {
        await cleanupTransactions();
        await createTransaction('500000'); // 50% of 1 million

        const response = await makeRequest(
          `/api/budget/category/${testCategoryId}/remaining?currency=IDR`,
          'GET'
        );

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data.budget_amount).toBe('1000000');
        expect(json.data.spent_amount).toBe('500000');
        expect(json.data.remaining).toBe('500000');
        expect(json.data.percentage_used).toBe('50');
      });
    });

    it('should show warning status at 80% threshold', async () => {
      skipIfNoUser(async () => {
        await cleanupTransactions();
        await createTransaction('800000'); // 80% of 1 million

        const response = await makeRequest(
          `/api/budget/category/${testCategoryId}/remaining?currency=IDR`,
          'GET'
        );

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data.spent_amount).toBe('800000');
        expect(json.data.remaining).toBe('200000');
        expect(json.data.percentage_used).toBe('80');
      });
    });

    it('should show exceeded status when over 100%', async () => {
      skipIfNoUser(async () => {
        await cleanupTransactions();
        await createTransaction('1200000'); // 120% of 1 million

        const response = await makeRequest(
          `/api/budget/category/${testCategoryId}/remaining?currency=IDR`,
          'GET'
        );

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data.spent_amount).toBe('1200000');
        expect(json.data.remaining).toBe('-200000'); // Negative when exceeded
        expect(json.data.percentage_used).toBe('120');
      });
    });

    it('should return category name in response', async () => {
      skipIfNoUser(async () => {
        await cleanupTransactions();

        const response = await makeRequest(
          `/api/budget/category/${testCategoryId}/remaining?currency=IDR`,
          'GET'
        );

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data).toHaveProperty('category_name');
        expect(typeof json.data.category_name).toBe('string');
      });
    });

    it('should handle multiple transactions in current month', async () => {
      skipIfNoUser(async () => {
        await cleanupTransactions();
        await createTransaction('300000');
        await createTransaction('200000');
        await createTransaction('150000');

        const response = await makeRequest(
          `/api/budget/category/${testCategoryId}/remaining?currency=IDR`,
          'GET'
        );

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data.spent_amount).toBe('650000'); // Sum of all transactions
        expect(json.data.remaining).toBe('350000');
        expect(json.data.percentage_used).toBe('65');
      });
    });

    it('should reject requests without authentication', async () => {
      skipIfNoUser(async () => {
        const url = new URL(
          `/api/budget/category/${testCategoryId}/remaining?currency=IDR`,
          'http://localhost:4321'
        );

        const response = await fetch(url.toString(), {
          method: 'GET',
        });

        expect(response.status).toBe(401);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });

    it('should return 404 for non-existent category', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest(
          `/api/budget/category/nonexistent-id/remaining?currency=IDR`,
          'GET'
        );

        expect(response.status).toBe(404);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.message).toContain('Category not found');
      });
    });

    it('should reject requests for another user category', async () => {
      skipIfNoUser(async () => {
        // Ensure test workspace exists
        const existingWorkspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, TEST_WORKSPACE_ID),
        });
        if (!existingWorkspace) {
          await db.insert(workspaces).values({
            id: TEST_WORKSPACE_ID,
            name: 'Test Isolation Workspace',
            created_at: new Date(),
            updated_at: new Date(),
          });
        }

        // Create another user and category
        const otherUserId = `other-user-${Date.now()}`;
        const otherCategoryId = nanoid();

        await db.insert(users).values({
          id: otherUserId,
          workspace_id: TEST_WORKSPACE_ID,
          email: `other-${Date.now()}@example.com`,
          name: 'Other User',
          password_hash: 'dummy_hash',
          role: 'member',
          created_at: new Date(),
          updated_at: new Date(),
        });

        await db.insert(categories).values({
          id: otherCategoryId,
          user_id: otherUserId,
          name: "Other User's Category",
          type: 'expense',
          icon: 'tag',
          color: 'bg-neutral',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        });

        try {
          // Try to get other user's category remaining budget
          const response = await makeRequest(
            `/api/budget/category/${otherCategoryId}/remaining?currency=IDR`,
            'GET'
          );

          expect(response.status).toBe(404); // Category not found (ownership check)

          const json = await response.json();
          expect(json.success).toBe(false);
        } finally {
          // Clean up - always runs even if test fails
          await db.delete(categories).where(eq(categories.id, otherCategoryId));
          await db.delete(users).where(eq(users.id, otherUserId));
        }
      });
    });

    it('should handle category with zero budget amount', async () => {
      skipIfNoUser(async () => {
        // Create a category with zero budget (no budget record = zero budget)
        const [zeroBudgetCategory] = await db
          .insert(categories)
          .values({
            id: nanoid(),
            user_id: testUserId,
            name: `Zero Budget Category ${Date.now()}`,
            type: 'expense',
            icon: 'tag',
            color: 'bg-neutral',
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning();

        try {
          const response = await makeRequest(
            `/api/budget/category/${zeroBudgetCategory.id}/remaining?currency=IDR`,
            'GET'
          );

          expect(response.status).toBe(200);

          const json = await response.json();
          expect(json.success).toBe(true);
          expect(json.data.budget_amount).toBe('0');
          expect(json.data.percentage_used).toBe('0');
        } finally {
          await db.delete(categories).where(eq(categories.id, zeroBudgetCategory.id));
        }
      });
    });

    it('should handle decimal amounts correctly', async () => {
      skipIfNoUser(async () => {
        await cleanupTransactions();

        // Create category with decimal budget
        const [decimalCategory] = await db
          .insert(categories)
          .values({
            id: nanoid(),
            user_id: testUserId,
            name: `Decimal Budget Category ${Date.now()}`,
            type: 'expense',
            icon: 'tag',
            color: 'bg-neutral',
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning();

        const decimalCategoryId = decimalCategory.id;

        // Create budget for this category
        const now = new Date();
        await db.insert(budgets).values({
          id: nanoid(),
          user_id: testUserId,
          category_id: decimalCategoryId,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          budget_amount: '100000.50',
          currency: 'IDR',
          is_closed: false,
          created_at: new Date(),
          updated_at: new Date(),
        });

        try {
          // Create transaction with decimal amount
          await db.insert(transactions).values({
            id: nanoid(),
            user_id: testUserId,
            category_id: decimalCategoryId,
            asset_id: testAssetId,
            type: 'expense',
            amount: '50000.25',
            currency: 'IDR',
            transaction_date: new Date(),
            description: 'Decimal transaction',
            created_at: new Date(),
            updated_at: new Date(),
          });

          const response = await makeRequest(
            `/api/budget/category/${decimalCategoryId}/remaining?currency=IDR`,
            'GET'
          );

          expect(response.status).toBe(200);

          const json = await response.json();
          expect(json.success).toBe(true);
          expect(json.data.budget_amount).toBe('100000.50');
          expect(json.data.spent_amount).toBe('50000.25');
          expect(json.data.remaining).toBe('50000.25');
        } finally {
          // Clean up
          await db
            .delete(transactions)
            .where(
              and(
                eq(transactions.category_id, decimalCategory.id),
                eq(transactions.user_id, testUserId)
              )
            );
          await db.delete(categories).where(eq(categories.id, decimalCategory.id));
        }
      });
    });

    it('should only include transactions from current month', async () => {
      skipIfNoUser(async () => {
        await cleanupTransactions();

        // Create transaction in current month
        const now = new Date();
        await db.insert(transactions).values({
          id: nanoid(),
          user_id: testUserId,
          category_id: testCategoryId,
          asset_id: testAssetId,
          type: 'expense',
          amount: '100000',
          currency: 'IDR',
          transaction_date: now,
          description: 'Current month transaction',
          created_at: new Date(),
          updated_at: new Date(),
        });

        // Create transaction in previous month
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
        await db.insert(transactions).values({
          id: nanoid(),
          user_id: testUserId,
          category_id: testCategoryId,
          asset_id: testAssetId,
          type: 'expense',
          amount: '500000',
          currency: 'IDR',
          transaction_date: lastMonth,
          description: 'Previous month transaction',
          created_at: new Date(),
          updated_at: new Date(),
        });

        const response = await makeRequest(
          `/api/budget/category/${testCategoryId}/remaining?currency=IDR`,
          'GET'
        );

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        // Should only count current month transaction
        expect(json.data.spent_amount).toBe('100000');
        expect(json.data.remaining).toBe('900000');
      });
    });

    it('should handle deleted transactions (soft delete)', async () => {
      skipIfNoUser(async () => {
        await cleanupTransactions();

        const now = new Date();
        // Create active transaction
        await db.insert(transactions).values({
          id: nanoid(),
          user_id: testUserId,
          category_id: testCategoryId,
          asset_id: testAssetId,
          type: 'expense',
          amount: '200000',
          currency: 'IDR',
          transaction_date: now,
          description: 'Active transaction',
          created_at: new Date(),
          updated_at: new Date(),
        });

        // Create deleted transaction
        await db.insert(transactions).values({
          id: nanoid(),
          user_id: testUserId,
          category_id: testCategoryId,
          asset_id: testAssetId,
          type: 'expense',
          amount: '300000',
          currency: 'IDR',
          transaction_date: now,
          description: 'Deleted transaction',
          deleted_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        });

        const response = await makeRequest(
          `/api/budget/category/${testCategoryId}/remaining?currency=IDR`,
          'GET'
        );

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        // Should only count active transaction (not deleted)
        expect(json.data.spent_amount).toBe('200000');
        expect(json.data.remaining).toBe('800000');
      });
    });
  });

  // Cleanup test data after all tests
  afterAll(async () => {
    if (!shouldSkip) {
      // Delete all transactions for the test user and category
      await db
        .delete(transactions)
        .where(
          and(eq(transactions.category_id, testCategoryId), eq(transactions.user_id, testUserId))
        );

      // Delete the test category
      if (testCategoryId) {
        await db.delete(categories).where(eq(categories.id, testCategoryId));
        console.log(`Cleaned up test category: ${testCategoryId}`);
      }

      /// Note: Don't delete the asset as it may have orphaned transactions
      // from test runs or other sources. The test asset can be cleaned
      // up manually or through a full database reset.
      if (testAssetId) {
        console.log(`Test asset ${testAssetId} left in place`);
      }
    }
  });
});
