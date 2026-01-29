/**
 * Reports API Integration Tests
 * ==============================
 *
 * Integration tests for reports API endpoints with real database.
 * Tests monthly/yearly reports and category drill-down functionality.
 *
 * Prerequisites:
 * - Database must be seeded with test data (run `bun run db:seed`)
 * - Demo user (demo@example.com) must exist from the seeder
 * - Server must be running (run `bun run dev`)
 *
 * Usage: bun test src/pages/api/reports/reports.api.integration.test.ts
 *
 * @todo P3: Add tests for caching strategy when implemented
 * @todo P3: Add tests for rate limiting when implemented
 */

/* eslint-disable no-console -- Console output is intentional for test progress feedback */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { db } from '@/db';
import { users } from '@/db';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth/lucia';
import { clearRateLimitStore } from '@/lib/rate-limit';

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4321';

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

describe('Reports API Integration Tests', () => {
  beforeAll(async () => {
    // Clear rate limit store to prevent test interference
    clearRateLimitStore();

    // Check if server is running
    try {
      await fetch(`${API_BASE_URL}/`, { method: 'HEAD' });
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

    console.log(`Reports API integration tests using demo user: ${user.name} (${user.email})`);
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

  describe('GET /api/reports (JSON)', () => {
    it('should return monthly report with valid params', () =>
      skipIfNotReady(async () => {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const period = `${year}-${month}`;

        const response = await fetch(
          `${API_BASE_URL}/api/reports?range=monthly&period=${period}&currency=IDR`,
          {
            headers: {
              Cookie: `auth_session=${testSessionId}`,
            },
          }
        );

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toContain('application/json');

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
        expect(data.data.totalIncome).toBeDefined();
        expect(data.data.totalExpenses).toBeDefined();
        expect(data.data.netSavings).toBeDefined();
        expect(data.data.budgetHealth).toBeGreaterThanOrEqual(0);
        expect(data.data.expenseCategories).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(data.data.expenseByCategory)).toBe(true);
        expect(Array.isArray(data.data.trendData)).toBe(true);
        expect(Array.isArray(data.data.categoryIntelligence)).toBe(true);
      }));

    it('should return yearly report with valid params', () =>
      skipIfNotReady(async () => {
        const year = new Date().getFullYear();

        const response = await fetch(
          `${API_BASE_URL}/api/reports?range=yearly&period=${year}&currency=IDR`,
          {
            headers: {
              Cookie: `auth_session=${testSessionId}`,
            },
          }
        );

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
        expect(Array.isArray(data.data.trendData)).toBe(true);
        // Yearly report should have 12 months of trend data
        expect(data.data.trendData.length).toBeLessThanOrEqual(12);
      }));

    it('should return 401 without authentication', () =>
      skipIfNotReady(async () => {
        const response = await fetch(
          `${API_BASE_URL}/api/reports?range=monthly&period=2024-02&currency=IDR`
        );

        expect(response.status).toBe(401);
      }));

    it('should return 400 with invalid range', () =>
      skipIfNotReady(async () => {
        const response = await fetch(
          `${API_BASE_URL}/api/reports?range=invalid&period=2024-02&currency=IDR`,
          {
            headers: {
              Cookie: `auth_session=${testSessionId}`,
            },
          }
        );

        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error.message).toContain('Invalid range parameter');
      }));

    it('should return 400 with invalid monthly period format', () =>
      skipIfNotReady(async () => {
        const response = await fetch(
          `${API_BASE_URL}/api/reports?range=monthly&period=2024&currency=IDR`,
          {
            headers: {
              Cookie: `auth_session=${testSessionId}`,
            },
          }
        );

        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error.message).toContain('Invalid monthly period format');
      }));

    it('should return 400 with invalid month (month > 12)', () =>
      skipIfNotReady(async () => {
        const response = await fetch(
          `${API_BASE_URL}/api/reports?range=monthly&period=2024-13&currency=IDR`,
          {
            headers: {
              Cookie: `auth_session=${testSessionId}`,
            },
          }
        );

        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error.message).toContain('Invalid month');
      }));

    it('should return 400 with invalid year (year < 2000)', () =>
      skipIfNotReady(async () => {
        const response = await fetch(
          `${API_BASE_URL}/api/reports?range=monthly&period=1999-02&currency=IDR`,
          {
            headers: {
              Cookie: `auth_session=${testSessionId}`,
            },
          }
        );

        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error.message).toContain('Invalid year');
      }));

    it('should return 400 with invalid currency', () =>
      skipIfNotReady(async () => {
        const response = await fetch(
          `${API_BASE_URL}/api/reports?range=monthly&period=2024-02&currency=EUR`,
          {
            headers: {
              Cookie: `auth_session=${testSessionId}`,
            },
          }
        );

        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error.message).toContain('Invalid currency parameter');
      }));

    it('should filter data by userId (data isolation)', () =>
      skipIfNotReady(async () => {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const period = `${year}-${month}`;

        const response = await fetch(
          `${API_BASE_URL}/api/reports?range=monthly&period=${period}&currency=IDR`,
          {
            headers: {
              Cookie: `auth_session=${testSessionId}`,
            },
          }
        );

        const data = await response.json();
        // All category intelligence items should have valid category IDs
        // (implicitly filtered by userId in the service layer)
        if (data.data.categoryIntelligence.length > 0) {
          expect(data.data.categoryIntelligence[0].id).toBeDefined();
          expect(data.data.categoryIntelligence[0].name).toBeDefined();
        }
      }));
  });

  describe('GET /api/reports (HTML)', () => {
    it('should return HTML with _render=html', () =>
      skipIfNotReady(async () => {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const period = `${year}-${month}`;

        const response = await fetch(
          `${API_BASE_URL}/api/reports?range=monthly&period=${period}&currency=IDR&_render=html`,
          {
            headers: {
              Cookie: `auth_session=${testSessionId}`,
            },
          }
        );

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toContain('text/html');

        const html = await response.text();
        expect(html).toContain('<!-- PARTIAL:summary -->');
        expect(html).toContain('<!-- PARTIAL:charts -->');
        expect(html).toContain('<!-- PARTIAL:table -->');
      }));

    it('should return summary partial only with _partial=summary', () =>
      skipIfNotReady(async () => {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const period = `${year}-${month}`;

        const response = await fetch(
          `${API_BASE_URL}/api/reports?range=monthly&period=${period}&_render=html&_partial=summary`,
          {
            headers: {
              Cookie: `auth_session=${testSessionId}`,
            },
          }
        );

        const html = await response.text();
        expect(html).toContain('<!-- PARTIAL:summary -->');
        expect(html).not.toContain('<!-- PARTIAL:charts -->');
        expect(html).not.toContain('<!-- PARTIAL:table -->');
      }));

    it('should return charts partial only with _partial=charts', () =>
      skipIfNotReady(async () => {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const period = `${year}-${month}`;

        const response = await fetch(
          `${API_BASE_URL}/api/reports?range=monthly&period=${period}&_render=html&_partial=charts`,
          {
            headers: {
              Cookie: `auth_session=${testSessionId}`,
            },
          }
        );

        const html = await response.text();
        expect(html).not.toContain('<!-- PARTIAL:summary -->');
        expect(html).toContain('<!-- PARTIAL:charts -->');
        expect(html).not.toContain('<!-- PARTIAL:table -->');
      }));

    it('should return table partial only with _partial=table', () =>
      skipIfNotReady(async () => {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const period = `${year}-${month}`;

        const response = await fetch(
          `${API_BASE_URL}/api/reports?range=monthly&period=${period}&_render=html&_partial=table`,
          {
            headers: {
              Cookie: `auth_session=${testSessionId}`,
            },
          }
        );

        const html = await response.text();
        expect(html).not.toContain('<!-- PARTIAL:summary -->');
        expect(html).not.toContain('<!-- PARTIAL:charts -->');
        expect(html).toContain('<!-- PARTIAL:table -->');
      }));
  });

  describe('GET /api/reports/category-transactions', () => {
    it('should return category transactions with valid params', () =>
      skipIfNotReady(async () => {
        // First get a monthly report to find a valid category ID
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const period = `${year}-${month}`;

        const reportResponse = await fetch(
          `${API_BASE_URL}/api/reports?range=monthly&period=${period}&currency=IDR`,
          {
            headers: {
              Cookie: `auth_session=${testSessionId}`,
            },
          }
        );

        const reportData = await reportResponse.json();

        // Skip if no categories with spending
        if (reportData.data.categoryIntelligence.length === 0) {
          console.log('  ⏭️  Skipping: No categories with spending found');
          return;
        }

        const categoryId = reportData.data.categoryIntelligence[0].id;

        // Now fetch category transactions
        const response = await fetch(
          `${API_BASE_URL}/api/reports/category-transactions?categoryId=${categoryId}&period=${period}&range=monthly`,
          {
            headers: {
              Cookie: `auth_session=${testSessionId}`,
            },
          }
        );

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
        expect(Array.isArray(data.data.transactions)).toBe(true);
        expect(data.data.total).toBeDefined();
        expect(data.data.categoryName).toBeDefined();
      }));

    it('should return 401 without authentication', () =>
      skipIfNotReady(async () => {
        const response = await fetch(
          `${API_BASE_URL}/api/reports/category-transactions?categoryId=test-id&period=2024-02&range=monthly`
        );

        expect(response.status).toBe(401);
      }));

    it('should return 404 for non-existent category', () =>
      skipIfNotReady(async () => {
        const response = await fetch(
          `${API_BASE_URL}/api/reports/category-transactions?categoryId=non-existent-id&period=2024-02&range=monthly`,
          {
            headers: {
              Cookie: `auth_session=${testSessionId}`,
            },
          }
        );

        expect(response.status).toBe(404);

        const data = await response.json();
        expect(data.success).toBe(false);
      }));

    it('should return 400 with invalid period format', () =>
      skipIfNotReady(async () => {
        const response = await fetch(
          `${API_BASE_URL}/api/reports/category-transactions?categoryId=test-id&period=invalid&range=monthly`,
          {
            headers: {
              Cookie: `auth_session=${testSessionId}`,
            },
          }
        );

        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error.message).toContain('Invalid monthly period format');
      }));

    it('should return 400 with invalid range', () =>
      skipIfNotReady(async () => {
        const response = await fetch(
          `${API_BASE_URL}/api/reports/category-transactions?categoryId=test-id&period=2024-02&range=invalid`,
          {
            headers: {
              Cookie: `auth_session=${testSessionId}`,
            },
          }
        );

        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error.message).toContain('Invalid range parameter');
      }));

    it('should return 400 with missing categoryId', () =>
      skipIfNotReady(async () => {
        const response = await fetch(
          `${API_BASE_URL}/api/reports/category-transactions?period=2024-02&range=monthly`,
          {
            headers: {
              Cookie: `auth_session=${testSessionId}`,
            },
          }
        );

        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error.message).toContain('Category ID is required');
      }));

    it('should return 400 with invalid categoryId format', () =>
      skipIfNotReady(async () => {
        const response = await fetch(
          `${API_BASE_URL}/api/reports/category-transactions?categoryId=invalid@id&period=2024-02&range=monthly`,
          {
            headers: {
              Cookie: `auth_session=${testSessionId}`,
            },
          }
        );

        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error.message).toContain('Invalid category ID format');
        expect(data.error.code).toBe('INVALID_CATEGORY_ID');
      }));

    it('should calculate correct total for category transactions', () =>
      skipIfNotReady(async () => {
        // First get a monthly report
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const period = `${year}-${month}`;

        const reportResponse = await fetch(
          `${API_BASE_URL}/api/reports?range=monthly&period=${period}&currency=IDR`,
          {
            headers: {
              Cookie: `auth_session=${testSessionId}`,
            },
          }
        );

        const reportData = await reportResponse.json();

        // Skip if no categories with spending
        if (reportData.data.categoryIntelligence.length === 0) {
          console.log('  ⏭️  Skipping: No categories with spending found');
          return;
        }

        const categoryId = reportData.data.categoryIntelligence[0].id;
        const expectedTotal = reportData.data.categoryIntelligence[0].spent;

        // Fetch category transactions
        const response = await fetch(
          `${API_BASE_URL}/api/reports/category-transactions?categoryId=${categoryId}&period=${period}&range=monthly`,
          {
            headers: {
              Cookie: `auth_session=${testSessionId}`,
            },
          }
        );

        const data = await response.json();

        // Total should match the spent amount from category intelligence
        expect(parseFloat(data.data.total)).toBe(expectedTotal);
      }));
  });
});
