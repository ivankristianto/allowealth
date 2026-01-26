/**
 * Transaction API Integration Tests
 * ==================================
 *
 * Integration tests for transaction API endpoints with real database.
 * Tests list, create, read, update, and delete operations.
 *
 * Prerequisites:
 * - Database must be seeded with test data (run `bun run db:seed`)
 * - Demo user (demo@example.com) must exist from the seeder
 * - Server must be running (run `bun run dev`)
 *
 * Usage: bun test src/pages/api/transactions/transactions.api.integration.test.ts
 *
 * @todo P2: Add test for empty update body (PUT with {})
 * @todo P2: Add concurrent request handling tests (race conditions)
 * @todo P3: Extract test data values to named constants for clarity
 * @todo P3: Create helper function for common transaction creation pattern
 */

/* eslint-disable no-console -- Console output is intentional for test progress feedback */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'bun:test';
import { db } from '@/db';
import { users, transactions, categories, assets } from '@/db';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth/lucia';
import { clearRateLimitStore } from '@/lib/rate-limit';

// Test user credentials (matches the seeder)
const TEST_USER = {
  email: 'demo@example.com',
  password: 'demo123456789',
  name: 'Demo User',
};

// Test data holders
let testUserId: string;
let testSessionId: string;
let testCategoryId: string;
let testAssetId: string;
let shouldSkip = false;
let serverNotRunning = false;

// Track created transactions for cleanup
const createdTransactionIds: string[] = [];

describe('Transaction API Integration Tests', () => {
  beforeAll(async () => {
    // Clear rate limit store to prevent test interference
    clearRateLimitStore();

    // Check if server is running
    try {
      await fetch('http://localhost:4321/', { method: 'HEAD' });
    } catch (error: any) {
      if (error.code === 'ConnectionRefused' || error.message?.includes('connect')) {
        console.warn(`\n⚠️  Skipping API integration tests: Server not running.`);
        console.warn(`   Start the dev server with 'bun run dev' to run these tests.\n`);
        serverNotRunning = true;
        shouldSkip = true;
        return;
      }
    }

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

    // Get a category and asset for creating test transactions
    const category = await db.query.categories.findFirst({
      where: and(eq(categories.user_id, testUserId), eq(categories.type, 'expense')),
    });

    const asset = await db.query.assets.findFirst({
      where: eq(assets.user_id, testUserId),
    });

    if (!category || !asset) {
      console.warn(`\n⚠️  Skipping API integration tests: Categories/assets not found.`);
      console.warn(`   Run 'bun run db:seed' to create test data.\n`);
      shouldSkip = true;
      return;
    }

    testCategoryId = category.id;
    testAssetId = asset.id;

    // Create a session for authenticated requests
    const session = await auth.createSession(testUserId, {});
    testSessionId = session.id;

    console.log(`Transaction API integration tests using demo user: ${user.name} (${user.email})`);
  });

  afterEach(async () => {
    // Clear rate limit store between tests
    clearRateLimitStore();

    // Clean up transactions created during tests
    for (const transactionId of createdTransactionIds) {
      try {
        await db.delete(transactions).where(eq(transactions.id, transactionId));
      } catch {
        // Ignore cleanup errors
      }
    }
    createdTransactionIds.length = 0;
  });

  afterAll(async () => {
    // Invalidate test session
    if (testSessionId) {
      try {
        await auth.invalidateSession(testSessionId);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  // Helper to skip tests if setup failed
  const skipIfNotReady = (callback: () => void | Promise<void>) => {
    if (shouldSkip || serverNotRunning) {
      return;
    }
    return callback();
  };

  // Helper to make authenticated API requests
  const makeRequest = async (
    endpoint: string,
    method: string = 'GET',
    body?: Record<string, unknown>,
    headers?: Record<string, string>
  ): Promise<Response> => {
    const url = new URL(endpoint, 'http://localhost:4321');

    const requestHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      Cookie: `sid=${testSessionId}`,
      ...headers,
    };

    const options: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    return fetch(url.toString(), options);
  };

  // Helper to make unauthenticated API requests
  const makeUnauthenticatedRequest = async (
    endpoint: string,
    method: string = 'GET',
    body?: Record<string, unknown>
  ): Promise<Response> => {
    const url = new URL(endpoint, 'http://localhost:4321');

    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    return fetch(url.toString(), options);
  };

  // Helper to get today's date in YYYY-MM-DD format (local timezone to avoid midnight issues)
  const getTodayDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to get a past date in YYYY-MM-DD format (local timezone)
  const getPastDate = (daysAgo: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  describe('GET /api/transactions', () => {
    it('should return a list of transactions', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions');

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(Array.isArray(json.data.transactions)).toBe(true);
        expect(json.data.pagination).toBeDefined();
        expect(json.data.pagination).toHaveProperty('total');
        expect(json.data.pagination).toHaveProperty('limit');
        expect(json.data.pagination).toHaveProperty('offset');
      });
    });

    it('should filter by type=expense', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions?type=expense');

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(Array.isArray(json.data.transactions)).toBe(true);

        // All transactions should be expenses
        for (const transaction of json.data.transactions) {
          expect(transaction.type).toBe('expense');
        }
      });
    });

    it('should filter by type=income', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions?type=income');

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(Array.isArray(json.data.transactions)).toBe(true);

        // All transactions should be income
        for (const transaction of json.data.transactions) {
          expect(transaction.type).toBe('income');
        }
      });
    });

    it('should filter by date range', async () => {
      await skipIfNotReady(async () => {
        const startDate = getPastDate(30);
        const endDate = getTodayDate();

        const response = await makeRequest(
          `/api/transactions?start_date=${startDate}&end_date=${endDate}`
        );

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(Array.isArray(json.data.transactions)).toBe(true);
        // Should include summary when date range is provided
        expect(json.data.summary).toBeDefined();
      });
    });

    it('should paginate results with limit and offset', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions?limit=5&offset=0');

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(Array.isArray(json.data.transactions)).toBe(true);
        expect(json.data.transactions.length).toBeLessThanOrEqual(5);
        expect(json.data.pagination.limit).toBe(5);
        expect(json.data.pagination.offset).toBe(0);
      });
    });

    it('should filter by category_id', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest(`/api/transactions?category_id=${testCategoryId}`);

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(Array.isArray(json.data.transactions)).toBe(true);

        // All transactions should have the specified category
        for (const transaction of json.data.transactions) {
          expect(transaction.category_id).toBe(testCategoryId);
        }
      });
    });

    it('should filter by asset_id', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest(`/api/transactions?asset_id=${testAssetId}`);

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(Array.isArray(json.data.transactions)).toBe(true);

        // All transactions should have the specified asset
        for (const transaction of json.data.transactions) {
          expect(transaction.asset_id).toBe(testAssetId);
        }
      });
    });

    it('should filter by currency', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions?currency=IDR');

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(Array.isArray(json.data.transactions)).toBe(true);

        // All transactions should have IDR currency
        for (const transaction of json.data.transactions) {
          expect(transaction.currency).toBe('IDR');
        }
      });
    });

    it('should search by description', async () => {
      await skipIfNotReady(async () => {
        // Create a transaction with a unique description
        const uniqueDescription = `Test Search ${Date.now()}`;
        const createResponse = await makeRequest('/api/transactions', 'POST', {
          type: 'expense',
          amount: '50000',
          currency: 'IDR',
          category_id: testCategoryId,
          asset_id: testAssetId,
          transaction_date: getTodayDate(),
          description: uniqueDescription,
        });

        expect(createResponse.status).toBe(201);
        const createJson = await createResponse.json();
        createdTransactionIds.push(createJson.data.id);

        // Search for the transaction
        const searchResponse = await makeRequest(
          `/api/transactions?search=${encodeURIComponent(uniqueDescription)}`
        );

        expect(searchResponse.status).toBe(200);

        const searchJson = await searchResponse.json();
        expect(searchJson.success).toBe(true);
        expect(Array.isArray(searchJson.data.transactions)).toBe(true);
        expect(searchJson.data.transactions.length).toBeGreaterThanOrEqual(1);

        // Should find our transaction
        const found = searchJson.data.transactions.find(
          (t: any) => t.description === uniqueDescription
        );
        expect(found).toBeDefined();
      });
    });

    it('should reject invalid start_date format', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions?start_date=invalid-date');

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });

    it('should reject invalid end_date format', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions?end_date=invalid-date');

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });

    it('should reject unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const response = await makeUnauthenticatedRequest('/api/transactions');

        expect(response.status).toBe(401);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });

    it('should safely handle SQL injection attempts in search', async () => {
      await skipIfNotReady(async () => {
        const maliciousSearch = "'; DROP TABLE transactions; --";
        const response = await makeRequest(
          `/api/transactions?search=${encodeURIComponent(maliciousSearch)}`
        );

        // Should not fail with a server error
        expect(response.status).toBe(200);

        // Verify transactions table still exists by making another request
        const verifyResponse = await makeRequest('/api/transactions?limit=1');
        expect(verifyResponse.status).toBe(200);
      });
    });

    it('should handle offset beyond total count', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions?limit=10&offset=999999');

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data.transactions).toEqual([]);
      });
    });

    it('should handle zero offset', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions?limit=5&offset=0');

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data.pagination.offset).toBe(0);
      });
    });
  });

  describe('POST /api/transactions', () => {
    it('should create a new transaction successfully', async () => {
      await skipIfNotReady(async () => {
        const transactionData = {
          type: 'expense',
          amount: '150000',
          currency: 'IDR',
          category_id: testCategoryId,
          asset_id: testAssetId,
          transaction_date: getTodayDate(),
          description: 'Test transaction creation',
        };

        const response = await makeRequest('/api/transactions', 'POST', transactionData);

        expect(response.status).toBe(201);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data).toHaveProperty('id');
        expect(json.data.type).toBe('expense');
        expect(json.data.amount).toBe('150000');
        expect(json.data.currency).toBe('IDR');
        expect(json.data.category_id).toBe(testCategoryId);
        expect(json.data.asset_id).toBe(testAssetId);
        expect(json.data.description).toBe('Test transaction creation');

        // Track for cleanup
        createdTransactionIds.push(json.data.id);
      });
    });

    it('should create an income transaction', async () => {
      await skipIfNotReady(async () => {
        // Get an income category
        const incomeCategory = await db.query.categories.findFirst({
          where: and(eq(categories.user_id, testUserId), eq(categories.type, 'income')),
        });

        if (!incomeCategory) {
          console.warn('No income category found, skipping test');
          return;
        }

        const transactionData = {
          type: 'income',
          amount: '5000000',
          currency: 'IDR',
          category_id: incomeCategory.id,
          asset_id: testAssetId,
          transaction_date: getTodayDate(),
          description: 'Test income transaction',
        };

        const response = await makeRequest('/api/transactions', 'POST', transactionData);

        expect(response.status).toBe(201);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data.type).toBe('income');
        expect(json.data.amount).toBe('5000000');

        createdTransactionIds.push(json.data.id);
      });
    });

    it('should validate required fields', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions', 'POST', {});

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('VALIDATION_ERROR');
      });
    });

    it('should validate amount must be positive', async () => {
      await skipIfNotReady(async () => {
        const transactionData = {
          type: 'expense',
          amount: '-50000',
          currency: 'IDR',
          category_id: testCategoryId,
          asset_id: testAssetId,
          transaction_date: getTodayDate(),
        };

        const response = await makeRequest('/api/transactions', 'POST', transactionData);

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('VALIDATION_ERROR');
      });
    });

    it('should validate transaction_date format', async () => {
      await skipIfNotReady(async () => {
        const transactionData = {
          type: 'expense',
          amount: '50000',
          currency: 'IDR',
          category_id: testCategoryId,
          asset_id: testAssetId,
          transaction_date: 'invalid-date',
        };

        const response = await makeRequest('/api/transactions', 'POST', transactionData);

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('VALIDATION_ERROR');
      });
    });

    it('should reject future dates', async () => {
      await skipIfNotReady(async () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        const futureDateStr = futureDate.toISOString().split('T')[0];

        const transactionData = {
          type: 'expense',
          amount: '50000',
          currency: 'IDR',
          category_id: testCategoryId,
          asset_id: testAssetId,
          transaction_date: futureDateStr,
        };

        const response = await makeRequest('/api/transactions', 'POST', transactionData);

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('VALIDATION_ERROR');
      });
    });

    it('should validate type enum values', async () => {
      await skipIfNotReady(async () => {
        const transactionData = {
          type: 'invalid-type',
          amount: '50000',
          currency: 'IDR',
          category_id: testCategoryId,
          asset_id: testAssetId,
          transaction_date: getTodayDate(),
        };

        const response = await makeRequest('/api/transactions', 'POST', transactionData);

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('VALIDATION_ERROR');
      });
    });

    it('should validate currency enum values', async () => {
      await skipIfNotReady(async () => {
        const transactionData = {
          type: 'expense',
          amount: '50000',
          currency: 'INVALID',
          category_id: testCategoryId,
          asset_id: testAssetId,
          transaction_date: getTodayDate(),
        };

        const response = await makeRequest('/api/transactions', 'POST', transactionData);

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('VALIDATION_ERROR');
      });
    });

    it('should reject requests with wrong Content-Type', async () => {
      await skipIfNotReady(async () => {
        const url = new URL('/api/transactions', 'http://localhost:4321');

        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
            Cookie: `sid=${testSessionId}`,
          },
          body: 'not json',
        });

        expect(response.status).toBe(415);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
      });
    });

    it('should handle malformed JSON', async () => {
      await skipIfNotReady(async () => {
        const url = new URL('/api/transactions', 'http://localhost:4321');

        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `sid=${testSessionId}`,
          },
          body: 'invalid json{',
        });

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });

    it('should reject unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const transactionData = {
          type: 'expense',
          amount: '50000',
          currency: 'IDR',
          category_id: testCategoryId,
          asset_id: testAssetId,
          transaction_date: getTodayDate(),
        };

        const response = await makeUnauthenticatedRequest(
          '/api/transactions',
          'POST',
          transactionData
        );

        expect(response.status).toBe(401);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });

    it('should validate description max length', async () => {
      await skipIfNotReady(async () => {
        const transactionData = {
          type: 'expense',
          amount: '50000',
          currency: 'IDR',
          category_id: testCategoryId,
          asset_id: testAssetId,
          transaction_date: getTodayDate(),
          description: 'x'.repeat(501), // Max is 500
        };

        const response = await makeRequest('/api/transactions', 'POST', transactionData);

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('GET /api/transactions/:id', () => {
    it('should return a transaction by ID', async () => {
      await skipIfNotReady(async () => {
        // Create a transaction first
        const createResponse = await makeRequest('/api/transactions', 'POST', {
          type: 'expense',
          amount: '75000',
          currency: 'IDR',
          category_id: testCategoryId,
          asset_id: testAssetId,
          transaction_date: getTodayDate(),
          description: 'Test get by ID',
        });

        expect(createResponse.status).toBe(201);
        const createJson = await createResponse.json();
        const transactionId = createJson.data.id;
        createdTransactionIds.push(transactionId);

        // Get the transaction
        const getResponse = await makeRequest(`/api/transactions/${transactionId}`);

        expect(getResponse.status).toBe(200);

        const getJson = await getResponse.json();
        expect(getJson.success).toBe(true);
        expect(getJson.data.id).toBe(transactionId);
        expect(getJson.data.type).toBe('expense');
        expect(getJson.data.amount).toBe('75000');
        expect(getJson.data.description).toBe('Test get by ID');
      });
    });

    it('should return 404 for non-existent transaction', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions/non-existent-id-12345');

        expect(response.status).toBe(404);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });

    it('should return 400 for invalid transaction ID format', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions/invalid@id!');

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });

    it('should reject unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const response = await makeUnauthenticatedRequest('/api/transactions/some-id');

        expect(response.status).toBe(401);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });

    it('should not return transactions from other users', async () => {
      await skipIfNotReady(async () => {
        // Create a transaction directly in the database with a different user ID
        // Note: We use the test user's category/asset IDs since the API
        // only checks user_id on the transaction itself, not related entities.
        // In a real scenario, a malicious user wouldn't have access to
        // another user's categories/assets anyway.
        const otherUserId = 'other-user-id-12345';
        const transactionId = `other-user-txn-${Date.now()}`;

        await db.insert(transactions).values({
          id: transactionId,
          user_id: otherUserId,
          category_id: testCategoryId,
          asset_id: testAssetId,
          type: 'expense',
          amount: '10000',
          currency: 'IDR',
          transaction_date: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        });

        // Try to get the transaction as the demo user
        const response = await makeRequest(`/api/transactions/${transactionId}`);

        // Should not be found (user can only access their own transactions)
        expect(response.status).toBe(404);

        // Clean up
        await db.delete(transactions).where(eq(transactions.id, transactionId));
      });
    });
  });

  describe('PUT /api/transactions/:id', () => {
    it('should update a transaction successfully', async () => {
      await skipIfNotReady(async () => {
        // Create a transaction first
        const createResponse = await makeRequest('/api/transactions', 'POST', {
          type: 'expense',
          amount: '100000',
          currency: 'IDR',
          category_id: testCategoryId,
          asset_id: testAssetId,
          transaction_date: getTodayDate(),
          description: 'Original description',
        });

        expect(createResponse.status).toBe(201);
        const createJson = await createResponse.json();
        const transactionId = createJson.data.id;
        createdTransactionIds.push(transactionId);

        // Update the transaction
        const updateResponse = await makeRequest(`/api/transactions/${transactionId}`, 'PUT', {
          amount: '150000',
          description: 'Updated description',
        });

        expect(updateResponse.status).toBe(200);

        const updateJson = await updateResponse.json();
        expect(updateJson.success).toBe(true);
        expect(updateJson.data.amount).toBe('150000');
        expect(updateJson.data.description).toBe('Updated description');
        // Other fields should remain unchanged
        expect(updateJson.data.type).toBe('expense');
        expect(updateJson.data.currency).toBe('IDR');
      });
    });

    it('should update transaction type', async () => {
      await skipIfNotReady(async () => {
        // Get an income category
        const incomeCategory = await db.query.categories.findFirst({
          where: and(eq(categories.user_id, testUserId), eq(categories.type, 'income')),
        });

        if (!incomeCategory) {
          console.warn('No income category found, skipping test');
          return;
        }

        // Create an expense transaction
        const createResponse = await makeRequest('/api/transactions', 'POST', {
          type: 'expense',
          amount: '100000',
          currency: 'IDR',
          category_id: testCategoryId,
          asset_id: testAssetId,
          transaction_date: getTodayDate(),
        });

        expect(createResponse.status).toBe(201);
        const createJson = await createResponse.json();
        const transactionId = createJson.data.id;
        createdTransactionIds.push(transactionId);

        // Update to income
        const updateResponse = await makeRequest(`/api/transactions/${transactionId}`, 'PUT', {
          type: 'income',
          category_id: incomeCategory.id,
        });

        expect(updateResponse.status).toBe(200);

        const updateJson = await updateResponse.json();
        expect(updateJson.data.type).toBe('income');
        expect(updateJson.data.category_id).toBe(incomeCategory.id);
      });
    });

    it('should return 404 for non-existent transaction', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions/non-existent-id-12345', 'PUT', {
          amount: '100000',
        });

        expect(response.status).toBe(404);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });

    it('should return 400 for invalid transaction ID format', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions/invalid@id!', 'PUT', {
          amount: '100000',
        });

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });

    it('should validate update data', async () => {
      await skipIfNotReady(async () => {
        // Create a transaction first
        const createResponse = await makeRequest('/api/transactions', 'POST', {
          type: 'expense',
          amount: '100000',
          currency: 'IDR',
          category_id: testCategoryId,
          asset_id: testAssetId,
          transaction_date: getTodayDate(),
        });

        const createJson = await createResponse.json();
        const transactionId = createJson.data.id;
        createdTransactionIds.push(transactionId);

        // Try to update with invalid data
        const response = await makeRequest(`/api/transactions/${transactionId}`, 'PUT', {
          amount: '-50000', // Invalid: negative amount
        });

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('VALIDATION_ERROR');
      });
    });

    it('should reject wrong Content-Type', async () => {
      await skipIfNotReady(async () => {
        const url = new URL('/api/transactions/some-id', 'http://localhost:4321');

        const response = await fetch(url.toString(), {
          method: 'PUT',
          headers: {
            'Content-Type': 'text/plain',
            Cookie: `sid=${testSessionId}`,
          },
          body: 'not json',
        });

        expect(response.status).toBe(415);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });

    it('should reject unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const response = await makeUnauthenticatedRequest('/api/transactions/some-id', 'PUT', {
          amount: '100000',
        });

        expect(response.status).toBe(401);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    it('should delete a transaction successfully', async () => {
      await skipIfNotReady(async () => {
        // Create a transaction first
        const createResponse = await makeRequest('/api/transactions', 'POST', {
          type: 'expense',
          amount: '50000',
          currency: 'IDR',
          category_id: testCategoryId,
          asset_id: testAssetId,
          transaction_date: getTodayDate(),
          description: 'Transaction to delete',
        });

        expect(createResponse.status).toBe(201);
        const createJson = await createResponse.json();
        const transactionId = createJson.data.id;

        // Delete the transaction
        const deleteResponse = await makeRequest(`/api/transactions/${transactionId}`, 'DELETE');

        expect(deleteResponse.status).toBe(200);

        const deleteJson = await deleteResponse.json();
        expect(deleteJson.success).toBe(true);
        expect(deleteJson.data.message).toBe('Transaction deleted successfully');

        // Verify it's deleted
        const getResponse = await makeRequest(`/api/transactions/${transactionId}`);
        expect(getResponse.status).toBe(404);
      });
    });

    it('should return 404 for non-existent transaction', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions/non-existent-id-12345', 'DELETE');

        expect(response.status).toBe(404);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });

    it('should return 400 for invalid transaction ID format', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions/invalid@id!', 'DELETE');

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });

    it('should reject unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const response = await makeUnauthenticatedRequest('/api/transactions/some-id', 'DELETE');

        expect(response.status).toBe(401);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });

    it('should not delete transactions from other users', async () => {
      await skipIfNotReady(async () => {
        // Create a transaction directly in the database with a different user ID
        // Note: See comment in GET tests about using shared category/asset IDs
        const otherUserId = 'other-user-delete-test';
        const transactionId = `other-user-delete-${Date.now()}`;

        await db.insert(transactions).values({
          id: transactionId,
          user_id: otherUserId,
          category_id: testCategoryId,
          asset_id: testAssetId,
          type: 'expense',
          amount: '10000',
          currency: 'IDR',
          transaction_date: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        });

        // Try to delete the transaction as the demo user
        const response = await makeRequest(`/api/transactions/${transactionId}`, 'DELETE');

        // Should not be found (user can only delete their own transactions)
        expect(response.status).toBe(404);

        // Verify transaction still exists
        const transaction = await db.query.transactions.findFirst({
          where: eq(transactions.id, transactionId),
        });
        expect(transaction).toBeDefined();

        // Clean up
        await db.delete(transactions).where(eq(transactions.id, transactionId));
      });
    });
  });
});
