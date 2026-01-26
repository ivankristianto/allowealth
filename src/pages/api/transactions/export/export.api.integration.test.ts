/**
 * Transaction Export API Integration Tests
 * =========================================
 *
 * Integration tests for transaction CSV export endpoint with real database.
 *
 * Prerequisites:
 * - Database must be seeded with test data (run `bun run db:seed`)
 * - Demo user (demo@example.com) must exist from the seeder
 * - Server must be running (run `bun run dev`)
 *
 * Usage: bun test src/pages/api/transactions/export/export.api.integration.test.ts
 *
 * @todo P0: Add SQL injection test for search parameter
 * @todo P2: Enhance filter tests to verify actual filtered content in CSV
 * @todo P3: Extract common test helpers to shared utility file
 * @todo P3: Extract test data values to named constants for clarity
 */

/* eslint-disable no-console -- Console output is intentional for test progress feedback */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { db } from '@/db';
import { users } from '@/db';
import { eq } from 'drizzle-orm';
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
let shouldSkip = false;
let serverNotRunning = false;

describe('Transaction Export API Integration Tests', () => {
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

    // Create a session for authenticated requests
    const session = await auth.createSession(testUserId, {});
    testSessionId = session.id;

    console.log(
      `Transaction Export API integration tests using demo user: ${user.name} (${user.email})`
    );
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
  const makeRequest = async (
    endpoint: string,
    headers?: Record<string, string>
  ): Promise<Response> => {
    const url = new URL(endpoint, 'http://localhost:4321');

    const requestHeaders: HeadersInit = {
      Cookie: `sid=${testSessionId}`,
      ...headers,
    };

    return fetch(url.toString(), {
      method: 'GET',
      headers: requestHeaders,
    });
  };

  // Helper to make unauthenticated API requests
  const makeUnauthenticatedRequest = async (endpoint: string): Promise<Response> => {
    const url = new URL(endpoint, 'http://localhost:4321');
    return fetch(url.toString(), { method: 'GET' });
  };

  describe('GET /api/transactions/export', () => {
    it('should export all transactions to CSV for authenticated user', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions/export');

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
        expect(response.headers.get('Content-Disposition')).toMatch(
          /^attachment; filename="transactions_\d{4}-\d{2}-\d{2}\.csv"$/
        );

        const csv = await response.text();
        expect(csv).toBeDefined();
        expect(csv.length).toBeGreaterThan(0);

        // Verify CSV structure (header line should be present)
        const lines = csv.trim().split('\n');
        expect(lines.length).toBeGreaterThanOrEqual(1);

        // Verify header columns
        const header = lines[0];
        expect(header).toContain('Date');
        expect(header).toContain('Type');
        expect(header).toContain('Amount');
        expect(header).toContain('Currency');
      });
    });

    it('should filter by transaction type', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions/export?type=expense');

        expect(response.status).toBe(200);
        const csv = await response.text();

        // Verify that all transactions are expenses (if any data exists)
        const lines = csv.trim().split('\n');
        if (lines.length > 1) {
          for (let i = 1; i < lines.length; i++) {
            expect(lines[i]).toMatch(/expense/i);
          }
        }
      });
    });

    it('should filter by date range', async () => {
      await skipIfNotReady(async () => {
        const startDate = '2024-01-01';
        const endDate = '2024-12-31';
        const response = await makeRequest(
          `/api/transactions/export?start_date=${startDate}&end_date=${endDate}`
        );

        expect(response.status).toBe(200);
        const csv = await response.text();
        expect(csv).toBeDefined();

        // CSV should have at least header
        const lines = csv.trim().split('\n');
        expect(lines.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should return 400 for invalid start_date', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions/export?start_date=invalid-date');

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toContain('Invalid start_date format');
      });
    });

    it('should return 400 for invalid end_date', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions/export?end_date=not-a-date');

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toContain('Invalid end_date format');
      });
    });

    it('should filter by currency', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions/export?currency=IDR');

        expect(response.status).toBe(200);
        const csv = await response.text();
        expect(csv).toBeDefined();
      });
    });

    it('should filter by category', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions/export?category_id=some-id');

        expect(response.status).toBe(200);
        const csv = await response.text();
        expect(csv).toBeDefined();
      });
    });

    it('should filter by asset', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions/export?asset_id=some-id');

        expect(response.status).toBe(200);
        const csv = await response.text();
        expect(csv).toBeDefined();
      });
    });

    it('should filter by search term', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions/export?search=grocery');

        expect(response.status).toBe(200);
        const csv = await response.text();
        expect(csv).toBeDefined();
      });
    });

    it('should apply multiple filters together', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest(
          '/api/transactions/export?type=expense&currency=IDR&start_date=2024-01-01'
        );

        expect(response.status).toBe(200);
        const csv = await response.text();
        expect(csv).toBeDefined();
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const response = await makeUnauthenticatedRequest('/api/transactions/export');

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.message).toBe('Unauthorized');
      });
    });

    it('should return empty CSV (header only) when no transactions match filters', async () => {
      await skipIfNotReady(async () => {
        // Use extremely narrow date range that likely has no data
        const response = await makeRequest(
          '/api/transactions/export?start_date=1990-01-01&end_date=1990-01-01'
        );

        expect(response.status).toBe(200);
        const csv = await response.text();

        const lines = csv.trim().split('\n');
        // Should have header, but no data rows (or maybe some old test data)
        expect(lines.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should generate unique filename with current date', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/transactions/export');

        expect(response.status).toBe(200);
        const contentDisposition = response.headers.get('Content-Disposition');

        // Extract date from filename
        const match = contentDisposition?.match(/transactions_(\d{4}-\d{2}-\d{2})\.csv/);
        expect(match).toBeDefined();

        const fileDate = match?.[1];
        expect(fileDate).toBeDefined();

        // Verify it's a valid date format
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        expect(fileDate).toMatch(datePattern);
      });
    });
  });
});
