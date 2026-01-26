/**
 * Budget API Integration Tests
 * =============================
 *
 * Integration tests for budget API endpoints with real database.
 * Tests overview, alerts, history, and export operations.
 *
 * Prerequisites:
 * - Database must be seeded with test data (run `bun run db:seed`)
 * - Demo user (demo@example.com) must exist from the seeder
 * - Server must be running (run `bun run dev`)
 *
 * Usage: bun test src/pages/api/budget/budget.api.integration.test.ts
 *
 * @todo P2: Enhance filter and sort tests to verify actual content correctness
 * @todo P3: Add sort order verification tests (parse CSV and verify sorting)
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

describe('Budget API Integration Tests', () => {
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

    console.log(`Budget API integration tests using demo user: ${user.name} (${user.email})`);
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

  describe('GET /api/budget/overview', () => {
    it('should get budget overview for current month', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/overview');

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('categories');
        expect(data.data).toHaveProperty('year');
        expect(data.data).toHaveProperty('month');
        expect(data.data).toHaveProperty('currency');
        expect(Array.isArray(data.data.categories)).toBe(true);
      });
    });

    it('should get budget overview for specific month', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/overview?year=2024&month=6');

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.year).toBe(2024);
        expect(data.data.month).toBe(6);
      });
    });

    it('should get budget overview in USD currency', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/overview?currency=USD');

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.currency).toBe('USD');
      });
    });

    it('should return 400 for invalid year', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/overview?year=1999');

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('Invalid year parameter');
      });
    });

    it('should return 400 for invalid month', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/overview?month=13');

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('Invalid month parameter');
      });
    });

    it('should return 400 for invalid currency', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/overview?currency=EUR');

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('Invalid currency parameter');
      });
    });

    it('should return 400 for non-numeric year', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/overview?year=invalid');

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('Invalid year parameter');
      });
    });

    it('should return 400 for non-numeric month', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/overview?month=invalid');

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('Invalid month parameter');
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const response = await makeUnauthenticatedRequest('/api/budget/overview');

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.message).toBe('Unauthorized');
      });
    });
  });

  describe('GET /api/budget/alerts', () => {
    it('should get budget alerts for current month', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/alerts');

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
      });
    });

    it('should get budget alerts in USD currency', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/alerts?currency=USD');

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
      });
    });

    it('should return 400 for invalid currency', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/alerts?currency=EUR');

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('Invalid currency parameter');
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const response = await makeUnauthenticatedRequest('/api/budget/alerts');

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.message).toBe('Unauthorized');
      });
    });
  });

  describe('GET /api/budget/history', () => {
    it('should get budget history with default months', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/history');

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
      });
    });

    it('should get budget history for specific number of months', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/history?months=6');

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
        // Should return at most 6 months of data
        expect(data.data.length).toBeLessThanOrEqual(6);
      });
    });

    it('should get budget history in USD currency', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/history?currency=USD');

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
      });
    });

    it('should filter budget history by year', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/history?year=2024');

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);

        // All entries should be from 2024
        for (const entry of data.data) {
          expect(entry.year).toBe(2024);
        }
      });
    });

    it('should return 400 for invalid months parameter', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/history?months=25');

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toContain('Invalid months parameter');
      });
    });

    it('should return 400 for invalid currency', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/history?currency=EUR');

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('Invalid currency parameter');
      });
    });

    it('should return 400 for invalid year', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/history?year=1999');

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('Invalid year parameter');
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const response = await makeUnauthenticatedRequest('/api/budget/history');

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.message).toBe('Unauthorized');
      });
    });
  });

  describe('GET /api/budget/export', () => {
    it('should export budget overview to CSV', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/export');

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
        expect(response.headers.get('Content-Disposition')).toMatch(
          /^attachment; filename="budget-\d{4}-\d{2}\.csv"$/
        );

        const csv = await response.text();
        expect(csv).toBeDefined();
        expect(csv.length).toBeGreaterThan(0);

        // Verify CSV structure
        const lines = csv.trim().split('\n');
        expect(lines.length).toBeGreaterThanOrEqual(1);

        // Verify header columns
        const header = lines[0];
        expect(header).toContain('Category');
        expect(header).toContain('Budget');
        expect(header).toContain('Spent');
      });
    });

    it('should export budget for specific month', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/export?year=2024&month=6');

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Disposition')).toContain('budget-2024-06.csv');

        const csv = await response.text();
        expect(csv).toBeDefined();
      });
    });

    it('should export budget in USD currency', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/export?currency=USD');

        expect(response.status).toBe(200);
        const csv = await response.text();
        expect(csv).toBeDefined();
      });
    });

    it('should support sorting by category', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/export?sort=category&order=asc');

        expect(response.status).toBe(200);
        const csv = await response.text();
        expect(csv).toBeDefined();
      });
    });

    it('should return 400 for invalid year', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/export?year=1999');

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('Invalid year parameter');
      });
    });

    it('should return 400 for invalid month', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/export?month=13');

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('Invalid month parameter');
      });
    });

    it('should return 400 for invalid currency', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/export?currency=EUR');

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('Invalid currency parameter');
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const response = await makeUnauthenticatedRequest('/api/budget/export');

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.message).toBe('Unauthorized');
      });
    });

    it('should generate correct filename format', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/budget/export?year=2024&month=3');

        expect(response.status).toBe(200);
        const contentDisposition = response.headers.get('Content-Disposition');

        // Should be budget-2024-03.csv with zero-padded month
        expect(contentDisposition).toBe('attachment; filename="budget-2024-03.csv"');
      });
    });
  });
});
