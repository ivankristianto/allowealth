/**
 * Transaction Import API Integration Tests
 * =========================================
 *
 * Integration tests for transaction CSV import endpoint with real database.
 *
 * Prerequisites:
 * - Database must be seeded with test data (run `bun run db:seed`)
 * - Demo user (demo@example.com) must exist from the seeder
 * - Server must be running (run `bun run dev`)
 *
 * Usage: bun test src/pages/api/transactions/import/import.api.integration.test.ts
 *
 * @todo P1: Add CSV injection attack test (formula injection with =, +, -, @ characters)
 * @todo P2: Add more boundary tests (499 rows, 501 rows, 502 rows)
 * @todo P2: Add edge cases for custom column mapping (partial mapping, invalid names, non-existent columns)
 * @todo P2: Consider batch cleanup operation for better performance
 * @todo P3: Extract common test helpers to shared utility file
 * @todo P3: Add character encoding tests (Unicode, emoji, special characters, different encodings)
 * @todo P3: Extract test data values to named constants for clarity
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
let testCategoryName: string;
let testAssetName: string;
let shouldSkip = false;
let serverNotRunning = false;

// Track created transactions for cleanup
const createdTransactionIds: string[] = [];

describe('Transaction Import API Integration Tests', () => {
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

    // Get a category and asset names for CSV data
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

    testCategoryName = category.name;
    testAssetName = asset.name;

    // Create a session for authenticated requests
    const session = await auth.createSession(testUserId, {});
    testSessionId = session.id;

    console.log(
      `Transaction Import API integration tests using demo user: ${user.name} (${user.email})`
    );
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
  const skipIfNotReady = (callback: () => void | Promise<void>): void | Promise<void> => {
    if (shouldSkip || serverNotRunning) {
      return;
    }
    return callback();
  };

  // Helper to make authenticated API requests
  const makeRequest = async (formData: FormData): Promise<Response> => {
    const url = new URL('/api/transactions/import', 'http://localhost:4321');

    return fetch(url.toString(), {
      method: 'POST',
      headers: {
        Cookie: `sid=${testSessionId}`,
      },
      body: formData,
    });
  };

  // Helper to make unauthenticated API requests
  const makeUnauthenticatedRequest = async (formData: FormData): Promise<Response> => {
    const url = new URL('/api/transactions/import', 'http://localhost:4321');

    return fetch(url.toString(), {
      method: 'POST',
      body: formData,
    });
  };

  // Helper to create a CSV file
  const createCSVFile = (content: string, filename: string = 'test.csv'): File => {
    return new File([content], filename, { type: 'text/csv' });
  };

  describe('POST /api/transactions/import', () => {
    it('should successfully import valid CSV file', async () => {
      await skipIfNotReady(async () => {
        const csvContent = `date,type,amount,currency,category,asset,description
2024-06-01,expense,50000,IDR,${testCategoryName},${testAssetName},Test import transaction
2024-06-02,expense,75000,IDR,${testCategoryName},${testAssetName},Another test transaction`;

        const formData = new FormData();
        formData.append('csv_file', createCSVFile(csvContent));

        const response = await makeRequest(formData);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.message).toBe('Import completed');
        expect(data.data.result).toBeDefined();
        expect(data.data.result.imported).toBeGreaterThanOrEqual(0);
        expect(data.data.result.skipped).toBeGreaterThanOrEqual(0);

        // Track created transactions for cleanup
        if (data.data.result.transactions) {
          for (const tx of data.data.result.transactions) {
            createdTransactionIds.push(tx.id);
          }
        }
      });
    });

    it('should return 400 when CSV file is missing', async () => {
      await skipIfNotReady(async () => {
        const formData = new FormData();
        // No file attached

        const response = await makeRequest(formData);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('CSV file is required');
      });
    });

    it('should return 400 when file is not a CSV', async () => {
      await skipIfNotReady(async () => {
        const formData = new FormData();
        const txtFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
        formData.append('csv_file', txtFile);

        const response = await makeRequest(formData);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('File must be a CSV');
      });
    });

    it('should handle malicious filename safely (path traversal)', async () => {
      await skipIfNotReady(async () => {
        const csvContent = `date,type,amount,currency,category,asset,description
2024-06-01,expense,50000,IDR,${testCategoryName},${testAssetName},Test`;

        // Attempt path traversal in filename
        const formData = new FormData();
        formData.append('csv_file', createCSVFile(csvContent, '../../../etc/passwd.csv'));

        const response = await makeRequest(formData);

        // Should handle safely (either 200 or 400, but not crash or write to wrong location)
        expect([200, 400]).toContain(response.status);

        if (response.status === 200) {
          const data = await response.json();
          if (data.data.result.transactions) {
            for (const tx of data.data.result.transactions) {
              createdTransactionIds.push(tx.id);
            }
          }
        }
      });
    });

    it('should validate file content not just extension', async () => {
      await skipIfNotReady(async () => {
        const formData = new FormData();
        // Create a file with CSV extension but malicious content
        const fakeFile = new File(['#!/bin/bash\nrm -rf /'], 'test.csv', { type: 'text/csv' });
        formData.append('csv_file', fakeFile);

        const response = await makeRequest(formData);

        // Should reject if content doesn't match CSV format
        expect([400, 415]).toContain(response.status);
      });
    });

    it('should return 413 when file size exceeds 5MB limit', async () => {
      await skipIfNotReady(async () => {
        // Create a large CSV (> 5MB)
        const largeContent = 'date,type,amount,currency,category,asset,description\n';
        const rowContent = '2024-06-01,expense,50000,IDR,Food,Cash,Test\n';
        const requiredRows = Math.ceil((5 * 1024 * 1024) / rowContent.length) + 1000;
        const largeCsv = largeContent + rowContent.repeat(requiredRows);

        const formData = new FormData();
        formData.append('csv_file', createCSVFile(largeCsv));

        const response = await makeRequest(formData);

        expect(response.status).toBe(413);
        const data = await response.json();
        expect(data.message).toContain('File size exceeds maximum limit');
      });
    });

    it('should return 400 when CSV exceeds 500 row limit', async () => {
      await skipIfNotReady(async () => {
        // Create CSV with 501 data rows (+ 1 header = 502 lines)
        const header = 'date,type,amount,currency,category,asset,description\n';
        const row = '2024-06-01,expense,50000,IDR,Food,Cash,Test\n';
        const csvContent = header + row.repeat(501);

        const formData = new FormData();
        formData.append('csv_file', createCSVFile(csvContent));

        const response = await makeRequest(formData);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toContain('CSV file exceeds maximum of 500 rows');
        expect(data.message).toContain('Found 501 data rows');
      });
    });

    it('should return 400 when CSV is empty (no data rows)', async () => {
      await skipIfNotReady(async () => {
        const csvContent = 'date,type,amount,currency,category,asset,description\n';

        const formData = new FormData();
        formData.append('csv_file', createCSVFile(csvContent));

        const response = await makeRequest(formData);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('CSV file must contain at least a header row and one data row');
      });
    });

    it('should return 400 when CSV has only whitespace', async () => {
      await skipIfNotReady(async () => {
        const csvContent = '   \n\n   ';

        const formData = new FormData();
        formData.append('csv_file', createCSVFile(csvContent));

        const response = await makeRequest(formData);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('CSV file must contain at least a header row and one data row');
      });
    });

    it('should handle custom column mapping', async () => {
      await skipIfNotReady(async () => {
        const csvContent = `transaction_date,transaction_type,transaction_amount,transaction_currency,transaction_category,transaction_payment,transaction_note
2024-06-01,expense,50000,IDR,${testCategoryName},${testAssetName},Custom columns test`;

        const formData = new FormData();
        formData.append('csv_file', createCSVFile(csvContent));
        formData.append('map_date', 'transaction_date');
        formData.append('map_type', 'transaction_type');
        formData.append('map_amount', 'transaction_amount');
        formData.append('map_currency', 'transaction_currency');
        formData.append('map_category', 'transaction_category');
        formData.append('map_asset', 'transaction_payment');
        formData.append('map_description', 'transaction_note');

        const response = await makeRequest(formData);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);

        // Track created transactions for cleanup
        if (data.data.result.transactions) {
          for (const tx of data.data.result.transactions) {
            createdTransactionIds.push(tx.id);
          }
        }
      });
    });

    it('should handle CSV with quoted fields', async () => {
      await skipIfNotReady(async () => {
        const csvContent = `date,type,amount,currency,category,asset,description
2024-06-01,expense,50000,IDR,"${testCategoryName}","${testAssetName}","Description with, comma"`;

        const formData = new FormData();
        formData.append('csv_file', createCSVFile(csvContent));

        const response = await makeRequest(formData);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);

        // Track created transactions for cleanup
        if (data.data.result.transactions) {
          for (const tx of data.data.result.transactions) {
            createdTransactionIds.push(tx.id);
          }
        }
      });
    });

    it('should handle CSV with different line endings (CRLF)', async () => {
      await skipIfNotReady(async () => {
        const csvContent = `date,type,amount,currency,category,asset,description\r\n2024-06-01,expense,50000,IDR,${testCategoryName},${testAssetName},Windows line endings`;

        const formData = new FormData();
        formData.append('csv_file', createCSVFile(csvContent));

        const response = await makeRequest(formData);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);

        // Track created transactions for cleanup
        if (data.data.result.transactions) {
          for (const tx of data.data.result.transactions) {
            createdTransactionIds.push(tx.id);
          }
        }
      });
    });

    it('should handle CSV with different line endings (CR)', async () => {
      await skipIfNotReady(async () => {
        const csvContent = `date,type,amount,currency,category,asset,description\r2024-06-01,expense,50000,IDR,${testCategoryName},${testAssetName},Mac line endings`;

        const formData = new FormData();
        formData.append('csv_file', createCSVFile(csvContent));

        const response = await makeRequest(formData);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);

        // Track created transactions for cleanup
        if (data.data.result.transactions) {
          for (const tx of data.data.result.transactions) {
            createdTransactionIds.push(tx.id);
          }
        }
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const csvContent = `date,type,amount,currency,category,asset,description
2024-06-01,expense,50000,IDR,Food,Cash,Test transaction`;

        const formData = new FormData();
        formData.append('csv_file', createCSVFile(csvContent));

        const response = await makeUnauthenticatedRequest(formData);

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.message).toBe('Unauthorized');
      });
    });

    it('should handle CSV with escaped quotes in quoted fields', async () => {
      await skipIfNotReady(async () => {
        const csvContent = `date,type,amount,currency,category,asset,description
2024-06-01,expense,50000,IDR,${testCategoryName},${testAssetName},"Description with ""quoted"" text"`;

        const formData = new FormData();
        formData.append('csv_file', createCSVFile(csvContent));

        const response = await makeRequest(formData);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);

        // Track created transactions for cleanup
        if (data.data.result.transactions) {
          for (const tx of data.data.result.transactions) {
            createdTransactionIds.push(tx.id);
          }
        }
      });
    });

    it('should allow exactly 500 rows (boundary test)', async () => {
      await skipIfNotReady(async () => {
        // Create CSV with exactly 500 data rows (+ 1 header = 501 lines)
        const header = 'date,type,amount,currency,category,asset,description\n';
        const row = `2024-06-01,expense,50000,IDR,${testCategoryName},${testAssetName},Test\n`;
        const csvContent = header + row.repeat(500);

        const formData = new FormData();
        formData.append('csv_file', createCSVFile(csvContent));

        const response = await makeRequest(formData);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);

        // Track created transactions for cleanup
        if (data.data.result.transactions) {
          for (const tx of data.data.result.transactions) {
            createdTransactionIds.push(tx.id);
          }
        }
      });
    });
  });
});
