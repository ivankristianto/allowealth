/**
 * Budget Category API Integration Tests
 * ====================================
 *
 * Integration tests for budget category PATCH endpoint with real database.
 * Tests budget allocation updates, validation, and authorization.
 *
 * Prerequisites:
 * - Database must be seeded with test data (run `bun run db:seed`)
 * - Demo user (demo@example.com) must exist from the seeder
 *
 * Usage: bun test src/pages/api/budget/category/budget-category.api.integration.test.ts
 */

/* eslint-disable no-console -- Console output is intentional for test progress feedback */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { db } from '@/db';
import { users, categories } from '@/db';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth/lucia';
import { nanoid } from 'nanoid';

// Test user credentials (matches the seeder)
const TEST_USER = {
  email: 'demo@example.com',
  password: 'demo123456789',
  name: 'Demo User',
};

describe('Budget Category API Integration Tests', () => {
  let testUserId: string;
  let sessionId: string;
  let testCategoryId: string;
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

    // Create a test category for budget updates
    const [category] = await db
      .insert(categories)
      .values({
        id: nanoid(),
        user_id: testUserId,
        name: `Test Budget Category ${Date.now()}`,
        type: 'expense',
        currency: 'IDR',
        percentage: '5.00',
        budget_amount: '5000000',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    testCategoryId = category.id;
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

  describe('PATCH /api/budget/category/:id', () => {
    it('should update percentage', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest(`/api/budget/category/${testCategoryId}`, 'PATCH', {
          percentage: '10.00',
        });

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data).toHaveProperty('id', testCategoryId);
        expect(json.data.percentage).toBe('10.00');

        // Verify in database
        const category = await db.query.categories.findFirst({
          where: eq(categories.id, testCategoryId),
        });
        expect(category?.percentage).toBe('10.00');
      });
    });

    it('should update budget_amount', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest(`/api/budget/category/${testCategoryId}`, 'PATCH', {
          budget_amount: '7500000',
        });

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data.budget_amount).toBe('7500000');

        // Verify in database
        const category = await db.query.categories.findFirst({
          where: eq(categories.id, testCategoryId),
        });
        expect(category?.budget_amount).toBe('7500000');
      });
    });

    it('should update both percentage and budget_amount', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest(`/api/budget/category/${testCategoryId}`, 'PATCH', {
          percentage: '15.50',
          budget_amount: '10000000',
        });

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data.percentage).toBe('15.50');
        expect(json.data.budget_amount).toBe('10000000');
      });
    });

    it('should accept currency that matches existing category currency', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest(`/api/budget/category/${testCategoryId}`, 'PATCH', {
          percentage: '20.00',
          currency: 'IDR',
        });

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data.currency).toBe('IDR');
      });
    });

    it('should reject currency that does not match category currency', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest(`/api/budget/category/${testCategoryId}`, 'PATCH', {
          percentage: '20.00',
          currency: 'USD', // Category is IDR
        });

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('VALIDATION_ERROR');
        expect(json.error.message).toContain('Currency must match category currency');
      });
    });

    it('should validate percentage is between 0 and 100', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest(`/api/budget/category/${testCategoryId}`, 'PATCH', {
          percentage: '150.00', // Invalid: > 100
        });

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('VALIDATION_ERROR');
      });
    });

    it('should validate budget_amount is non-negative', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest(`/api/budget/category/${testCategoryId}`, 'PATCH', {
          budget_amount: '-1000', // Invalid: negative
        });

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('VALIDATION_ERROR');
      });
    });

    it('should require at least one field to update', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest(`/api/budget/category/${testCategoryId}`, 'PATCH', {});

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('VALIDATION_ERROR');
        expect(json.error.details).toBeDefined();
      });
    });

    it('should reject requests for non-existent category', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest(`/api/budget/category/nonexistent-id`, 'PATCH', {
          percentage: '10.00',
        });

        expect(response.status).toBe(404);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('CATEGORY_NOT_FOUND');
      });
    });

    it('should reject requests without authentication', async () => {
      skipIfNoUser(async () => {
        const url = new URL(`/api/budget/category/${testCategoryId}`, 'http://localhost:4321');

        const response = await fetch(url.toString(), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ percentage: '10.00' }),
        });

        expect(response.status).toBe(401);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });

    it('should reject requests for another user category', async () => {
      skipIfNoUser(async () => {
        // Create another user and category
        const otherUserId = `other-user-${Date.now()}`;
        const otherCategoryId = nanoid();

        await db.insert(users).values({
          id: otherUserId,
          email: `other-${Date.now()}@example.com`,
          name: 'Other User',
          password_hash: 'dummy_hash',
          created_at: new Date(),
          updated_at: new Date(),
        });

        await db.insert(categories).values({
          id: otherCategoryId,
          user_id: otherUserId,
          name: "Other User's Category",
          type: 'expense',
          currency: 'IDR',
          percentage: '5.00',
          budget_amount: '1000000',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        });

        try {
          // Try to update other user's category
          const response = await makeRequest(`/api/budget/category/${otherCategoryId}`, 'PATCH', {
            percentage: '10.00',
          });

          expect(response.status).toBe(403);

          const json = await response.json();
          expect(json.success).toBe(false);
          expect(json.error.code).toBe('FORBIDDEN');
        } finally {
          // Clean up - always runs even if test fails
          await db.delete(categories).where(eq(categories.id, otherCategoryId));
          await db.delete(users).where(eq(users.id, otherUserId));
        }
      });
    });

    it('should handle malformed JSON', async () => {
      skipIfNoUser(async () => {
        const url = new URL(`/api/budget/category/${testCategoryId}`, 'http://localhost:4321');

        const response = await fetch(url.toString(), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Cookie: `sid=${sessionId}` },
          body: 'invalid json',
        });

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });

    it('should return all category fields in response', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest(`/api/budget/category/${testCategoryId}`, 'PATCH', {
          percentage: '25.00',
        });

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data).toMatchObject({
          id: testCategoryId,
          type: 'expense',
          percentage: '25.00',
          currency: 'IDR',
          is_active: true,
        });
        expect(json.data.name).toBeTruthy();
        expect(json.data.budget_amount).toBeTruthy();
      });
    });
  });

  // Cleanup test category after all tests
  afterAll(async () => {
    if (!shouldSkip && testCategoryId) {
      await db.delete(categories).where(eq(categories.id, testCategoryId));
      console.log(`Cleaned up test category: ${testCategoryId}`);
    }
  });
});
