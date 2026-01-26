/**
 * Payment Methods API Integration Tests
 * ======================================
 *
 * Integration tests for payment method API endpoints with real database.
 * Tests list, create, read, update, and delete operations.
 *
 * Prerequisites:
 * - Database must be seeded with test data (run `bun run db:seed`)
 * - Demo user (demo@example.com) must exist from the seeder
 * - Server must be running (run `bun run dev`)
 *
 * Usage: bun test src/pages/api/payment-methods/payment-methods.api.integration.test.ts
 *
 * @todo P1: Add maximum name length validation test
 * @todo P1: Add duplicate name test
 * @todo P1: Add update with same name test
 * @todo P1: Add malformed JSON test
 * @todo P1: Add wrong Content-Type test
 * @todo P2: Add concurrent request handling tests (race conditions)
 * @todo P2: Consider batch cleanup operation for better performance
 * @todo P3: Extract common test helpers to shared utility file
 * @todo P3: Add pagination tests if pagination is supported
 * @todo P3: Extract test data values to named constants for clarity
 */

/* eslint-disable no-console -- Console output is intentional for test progress feedback */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'bun:test';
import { nanoid } from 'nanoid';
import { db } from '@/db';
import { users, paymentMethods } from '@/db';
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

// Track created payment methods for cleanup
const createdPaymentMethodIds: string[] = [];

describe('Payment Methods API Integration Tests', () => {
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
      `Payment Methods API integration tests using demo user: ${user.name} (${user.email})`
    );
  });

  afterEach(async () => {
    // Clear rate limit store between tests
    clearRateLimitStore();

    // Clean up payment methods created during tests
    for (const paymentMethodId of createdPaymentMethodIds) {
      try {
        await db.delete(paymentMethods).where(eq(paymentMethods.id, paymentMethodId));
      } catch {
        // Ignore cleanup errors
      }
    }
    createdPaymentMethodIds.length = 0;
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

  describe('GET /api/payment-methods', () => {
    it('should list all payment methods for authenticated user', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/payment-methods');

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.data.length).toBeGreaterThan(0);

        // Verify payment method structure
        const paymentMethod = data.data[0];
        expect(paymentMethod).toHaveProperty('id');
        expect(paymentMethod).toHaveProperty('name');
        expect(paymentMethod).toHaveProperty('type');
        expect(paymentMethod).toHaveProperty('user_id');
        expect(paymentMethod.user_id).toBe(testUserId);
      });
    });

    it('should filter payment methods by is_active=true', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/payment-methods?is_active=true');

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);

        // All returned payment methods should be active
        for (const pm of data.data) {
          expect(pm.is_active).toBe(true);
        }
      });
    });

    it('should filter payment methods by is_active=false', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/payment-methods?is_active=false');

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);

        // All returned payment methods should be inactive
        for (const pm of data.data) {
          expect(pm.is_active).toBe(false);
        }
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const response = await makeUnauthenticatedRequest('/api/payment-methods');

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.message).toBe('Unauthorized');
      });
    });
  });

  describe('POST /api/payment-methods', () => {
    it('should create a new payment method with valid data', async () => {
      await skipIfNotReady(async () => {
        const newPaymentMethod = {
          name: 'Test Credit Card',
          type: 'credit_card',
        };

        const response = await makeRequest('/api/payment-methods', 'POST', newPaymentMethod);

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('id');
        expect(data.data.name).toBe(newPaymentMethod.name);
        expect(data.data.type).toBe(newPaymentMethod.type);
        expect(data.data.user_id).toBe(testUserId);
        expect(data.data.is_active).toBe(true);

        // Track for cleanup
        createdPaymentMethodIds.push(data.data.id);
      });
    });

    it('should return 400 when name is missing', async () => {
      await skipIfNotReady(async () => {
        const invalidPaymentMethod = {
          type: 'credit_card',
        };

        const response = await makeRequest('/api/payment-methods', 'POST', invalidPaymentMethod);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('Validation failed');
        expect(data.details).toBeDefined();
      });
    });

    it('should return 400 when type is missing', async () => {
      await skipIfNotReady(async () => {
        const invalidPaymentMethod = {
          name: 'Test Payment Method',
        };

        const response = await makeRequest('/api/payment-methods', 'POST', invalidPaymentMethod);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('Validation failed');
      });
    });

    it('should return 400 when type is invalid', async () => {
      await skipIfNotReady(async () => {
        const invalidPaymentMethod = {
          name: 'Test Payment Method',
          type: 'invalid_type',
        };

        const response = await makeRequest('/api/payment-methods', 'POST', invalidPaymentMethod);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('Validation failed');
      });
    });

    it('should return 400 when name is too short', async () => {
      await skipIfNotReady(async () => {
        const invalidPaymentMethod = {
          name: 'A',
          type: 'cash',
        };

        const response = await makeRequest('/api/payment-methods', 'POST', invalidPaymentMethod);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('Validation failed');
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const newPaymentMethod = {
          name: 'Test Payment Method',
          type: 'cash',
        };

        const response = await makeUnauthenticatedRequest(
          '/api/payment-methods',
          'POST',
          newPaymentMethod
        );

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.message).toBe('Unauthorized');
      });
    });

    it('should safely handle potential SQL injection in name field', async () => {
      await skipIfNotReady(async () => {
        const maliciousName = "Test'; DROP TABLE payment_methods; --";
        const response = await makeRequest('/api/payment-methods', 'POST', {
          name: maliciousName,
          type: 'cash',
        });

        // Should either create successfully or fail validation, not crash
        expect([201, 400]).toContain(response.status);

        // Verify table still exists
        const verifyResponse = await makeRequest('/api/payment-methods');
        expect(verifyResponse.status).toBe(200);

        if (response.status === 201) {
          const json = await response.json();
          createdPaymentMethodIds.push(json.data.id);
        }
      });
    });
  });

  describe('GET /api/payment-methods/:id', () => {
    it('should get a payment method by ID', async () => {
      await skipIfNotReady(async () => {
        // First, create a payment method
        const createResponse = await makeRequest('/api/payment-methods', 'POST', {
          name: 'Test Get Payment Method',
          type: 'bank_account',
        });

        const created = (await createResponse.json()).data;
        createdPaymentMethodIds.push(created.id);

        // Then, get it by ID
        const response = await makeRequest(`/api/payment-methods/${created.id}`);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.id).toBe(created.id);
        expect(data.data.name).toBe('Test Get Payment Method');
        expect(data.data.type).toBe('bank_account');
      });
    });

    it('should return 404 for non-existent payment method', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/payment-methods/non-existent-id');

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.message).toBe('Payment method not found');
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const response = await makeUnauthenticatedRequest('/api/payment-methods/some-id');

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.message).toBe('Unauthorized');
      });
    });
  });

  describe('PUT /api/payment-methods/:id', () => {
    it('should update a payment method', async () => {
      await skipIfNotReady(async () => {
        // First, create a payment method
        const createResponse = await makeRequest('/api/payment-methods', 'POST', {
          name: 'Original Name',
          type: 'cash',
        });

        const created = (await createResponse.json()).data;
        createdPaymentMethodIds.push(created.id);

        // Then, update it
        const updateData = {
          name: 'Updated Name',
          type: 'debit_card',
        };

        const response = await makeRequest(`/api/payment-methods/${created.id}`, 'PUT', updateData);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.id).toBe(created.id);
        expect(data.data.name).toBe('Updated Name');
        expect(data.data.type).toBe('debit_card');
      });
    });

    it('should return 400 when validation fails', async () => {
      await skipIfNotReady(async () => {
        // First, create a payment method
        const createResponse = await makeRequest('/api/payment-methods', 'POST', {
          name: 'Test Payment Method',
          type: 'cash',
        });

        const created = (await createResponse.json()).data;
        createdPaymentMethodIds.push(created.id);

        // Then, try to update with invalid data
        const response = await makeRequest(`/api/payment-methods/${created.id}`, 'PUT', {
          name: 'A', // Too short
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('Validation failed');
      });
    });

    it('should return 404 for non-existent payment method', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/payment-methods/non-existent-id', 'PUT', {
          name: 'Updated Name',
        });

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.message).toBe('Payment method not found');
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const response = await makeUnauthenticatedRequest('/api/payment-methods/some-id', 'PUT', {
          name: 'Updated Name',
        });

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.message).toBe('Unauthorized');
      });
    });
  });

  describe('DELETE /api/payment-methods/:id', () => {
    it('should soft delete a payment method', async () => {
      await skipIfNotReady(async () => {
        // First, create a payment method
        const createResponse = await makeRequest('/api/payment-methods', 'POST', {
          name: 'Test Delete Payment Method',
          type: 'cash',
        });

        const created = (await createResponse.json()).data;
        createdPaymentMethodIds.push(created.id);

        // Then, delete it
        const response = await makeRequest(`/api/payment-methods/${created.id}`, 'DELETE');

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.message).toBe('Payment method deleted successfully');

        // Verify it's marked as inactive
        const getResponse = await makeRequest(`/api/payment-methods/${created.id}`);
        const getResult = await getResponse.json();
        expect(getResult.data.is_active).toBe(false);
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const response = await makeUnauthenticatedRequest('/api/payment-methods/some-id', 'DELETE');

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.message).toBe('Unauthorized');
      });
    });
  });

  describe('User Isolation', () => {
    it('should not allow access to other users payment methods', async () => {
      await skipIfNotReady(async () => {
        // Create a second test user
        const secondUser = await db
          .insert(users)
          .values({
            id: nanoid(),
            email: 'test-isolation@example.com',
            name: 'Test Isolation User',
            password_hash: 'fake-hash',
          })
          .returning();

        const secondUserId = secondUser[0].id;

        // Create a payment method for the second user
        const paymentMethod = await db
          .insert(paymentMethods)
          .values({
            id: nanoid(),
            user_id: secondUserId,
            name: 'Second User Payment Method',
            type: 'cash',
          })
          .returning();

        const paymentMethodId = paymentMethod[0].id;

        // Try to access it with the first user's session
        const response = await makeRequest(`/api/payment-methods/${paymentMethodId}`);

        expect(response.status).toBe(404);

        // Cleanup
        await db.delete(paymentMethods).where(eq(paymentMethods.id, paymentMethodId));
        await db.delete(users).where(eq(users.id, secondUserId));
      });
    });
  });
});
