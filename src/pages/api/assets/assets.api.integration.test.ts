/**
 * Assets API Integration Tests
 * =============================
 *
 * Integration tests for asset API endpoints with real database.
 * Tests list, create, read, update, delete, balance updates, history, and summary operations.
 *
 * Prerequisites:
 * - Database must be seeded with test data (run `bun run db:seed`)
 * - Demo user (demo@example.com) must exist from the seeder
 * - Server must be running (run `bun run dev`)
 *
 * Usage: bun test src/pages/api/assets/assets.api.integration.test.ts
 *
 * @todo P0: Add SQL injection test for name and description fields
 * @todo P1: Add maximum name length validation test
 * @todo P1: Add duplicate name test
 * @todo P1: Add update with same name test
 * @todo P1: Add malformed JSON test
 * @todo P1: Add wrong Content-Type test
 * @todo P2: Add edge case tests for balance field (excessive decimals, very large numbers, scientific notation, boundary values)
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
import { users, assets, assetHistory } from '@/db';
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

// Track created assets and history for cleanup
const createdAssetIds: string[] = [];
const createdHistoryIds: string[] = [];

describe('Assets API Integration Tests', () => {
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

    console.log(`Assets API integration tests using demo user: ${user.name} (${user.email})`);
  });

  afterEach(async () => {
    // Clear rate limit store between tests
    clearRateLimitStore();

    // Clean up asset history created during tests
    for (const historyId of createdHistoryIds) {
      try {
        await db.delete(assetHistory).where(eq(assetHistory.id, historyId));
      } catch {
        // Ignore cleanup errors
      }
    }
    createdHistoryIds.length = 0;

    // Clean up assets created during tests
    for (const assetId of createdAssetIds) {
      try {
        await db.delete(assets).where(eq(assets.id, assetId));
      } catch {
        // Ignore cleanup errors
      }
    }
    createdAssetIds.length = 0;
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

  describe('GET /api/assets', () => {
    it('should list all assets for authenticated user', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/assets');

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);

        if (data.data.length > 0) {
          const asset = data.data[0];
          expect(asset).toHaveProperty('id');
          expect(asset).toHaveProperty('name');
          expect(asset).toHaveProperty('type');
          expect(asset).toHaveProperty('balance');
          expect(asset).toHaveProperty('currency');
          expect(asset).toHaveProperty('user_id');
          expect(asset.user_id).toBe(testUserId);
        }
      });
    });

    it('should filter assets by type', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/assets?type=bank_account');

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);

        // All returned assets should be bank_account type
        for (const asset of data.data) {
          expect(asset.type).toBe('bank_account');
        }
      });
    });

    it('should filter assets by currency', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/assets?currency=IDR');

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);

        // All returned assets should be in IDR
        for (const asset of data.data) {
          expect(asset.currency).toBe('IDR');
        }
      });
    });

    it('should filter assets by type and currency together', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/assets?type=bank_account&currency=IDR');

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);

        // All returned assets should match both filters
        for (const asset of data.data) {
          expect(asset.type).toBe('bank_account');
          expect(asset.currency).toBe('IDR');
        }
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const response = await makeUnauthenticatedRequest('/api/assets');

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.message).toBe('Unauthorized');
      });
    });
  });

  describe('POST /api/assets', () => {
    it('should create a new asset with valid data', async () => {
      await skipIfNotReady(async () => {
        const newAsset = {
          name: 'Test Bank Account',
          type: 'bank_account',
          balance: '1000000.50',
          currency: 'IDR',
        };

        const response = await makeRequest('/api/assets', 'POST', newAsset);

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('id');
        expect(data.data.name).toBe(newAsset.name);
        expect(data.data.type).toBe(newAsset.type);
        expect(data.data.balance).toBe(newAsset.balance);
        expect(data.data.currency).toBe(newAsset.currency);
        expect(data.data.user_id).toBe(testUserId);

        // Track for cleanup
        createdAssetIds.push(data.data.id);
      });
    });

    it('should return 400 when name is missing', async () => {
      await skipIfNotReady(async () => {
        const invalidAsset = {
          type: 'bank_account',
          balance: '1000000',
          currency: 'IDR',
        };

        const response = await makeRequest('/api/assets', 'POST', invalidAsset);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('Validation failed');
      });
    });

    it('should return 400 when type is invalid', async () => {
      await skipIfNotReady(async () => {
        const invalidAsset = {
          name: 'Test Asset',
          type: 'invalid_type',
          balance: '1000000',
          currency: 'IDR',
        };

        const response = await makeRequest('/api/assets', 'POST', invalidAsset);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('Validation failed');
      });
    });

    it('should return 400 when balance format is invalid', async () => {
      await skipIfNotReady(async () => {
        const invalidAsset = {
          name: 'Test Asset',
          type: 'bank_account',
          balance: 'not-a-number',
          currency: 'IDR',
        };

        const response = await makeRequest('/api/assets', 'POST', invalidAsset);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('Validation failed');
      });
    });

    it('should return 400 when currency is invalid', async () => {
      await skipIfNotReady(async () => {
        const invalidAsset = {
          name: 'Test Asset',
          type: 'bank_account',
          balance: '1000000',
          currency: 'EUR',
        };

        const response = await makeRequest('/api/assets', 'POST', invalidAsset);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('Validation failed');
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const newAsset = {
          name: 'Test Asset',
          type: 'bank_account',
          balance: '1000000',
          currency: 'IDR',
        };

        const response = await makeUnauthenticatedRequest('/api/assets', 'POST', newAsset);

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.message).toBe('Unauthorized');
      });
    });
  });

  describe('GET /api/assets/:id', () => {
    it('should get an asset by ID', async () => {
      await skipIfNotReady(async () => {
        // First, create an asset
        const createResponse = await makeRequest('/api/assets', 'POST', {
          name: 'Test Get Asset',
          type: 'mutual_fund',
          balance: '5000000',
          currency: 'IDR',
        });

        const created = (await createResponse.json()).data;
        createdAssetIds.push(created.id);

        // Then, get it by ID
        const response = await makeRequest(`/api/assets/${created.id}`);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.id).toBe(created.id);
        expect(data.data.name).toBe('Test Get Asset');
      });
    });

    it('should return 404 for non-existent asset', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/assets/non-existent-id');

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.message).toBe('Asset not found');
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const response = await makeUnauthenticatedRequest('/api/assets/some-id');

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.message).toBe('Unauthorized');
      });
    });
  });

  describe('PUT /api/assets/:id', () => {
    it('should update an asset', async () => {
      await skipIfNotReady(async () => {
        // First, create an asset
        const createResponse = await makeRequest('/api/assets', 'POST', {
          name: 'Original Name',
          type: 'bank_account',
          balance: '1000000',
          currency: 'IDR',
        });

        const created = (await createResponse.json()).data;
        createdAssetIds.push(created.id);

        // Then, update it
        const updateData = {
          name: 'Updated Name',
        };

        const response = await makeRequest(`/api/assets/${created.id}`, 'PUT', updateData);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.id).toBe(created.id);
        expect(data.data.name).toBe('Updated Name');
      });
    });

    it('should return 404 for non-existent asset', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/assets/non-existent-id', 'PUT', {
          name: 'Updated Name',
        });

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.message).toBe('Asset not found');
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const response = await makeUnauthenticatedRequest('/api/assets/some-id', 'PUT', {
          name: 'Updated Name',
        });

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.message).toBe('Unauthorized');
      });
    });
  });

  describe('DELETE /api/assets/:id', () => {
    it('should delete an asset', async () => {
      await skipIfNotReady(async () => {
        // First, create an asset
        const createResponse = await makeRequest('/api/assets', 'POST', {
          name: 'Test Delete Asset',
          type: 'bank_account',
          balance: '1000000',
          currency: 'IDR',
        });

        const created = (await createResponse.json()).data;
        createdAssetIds.push(created.id);

        // Then, delete it
        const response = await makeRequest(`/api/assets/${created.id}`, 'DELETE');

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);

        // Verify it's deleted
        const getResponse = await makeRequest(`/api/assets/${created.id}`);
        expect(getResponse.status).toBe(404);
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const response = await makeUnauthenticatedRequest('/api/assets/some-id', 'DELETE');

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.message).toBe('Unauthorized');
      });
    });
  });

  describe('POST /api/assets/:id/balance', () => {
    it('should update asset balance', async () => {
      await skipIfNotReady(async () => {
        // First, create an asset
        const createResponse = await makeRequest('/api/assets', 'POST', {
          name: 'Test Balance Update',
          type: 'bank_account',
          balance: '1000000',
          currency: 'IDR',
        });

        const created = (await createResponse.json()).data;
        createdAssetIds.push(created.id);

        // Then, update balance
        const balanceUpdate = {
          balance: '1500000',
          notes: 'Added savings',
        };

        const response = await makeRequest(
          `/api/assets/${created.id}/balance`,
          'POST',
          balanceUpdate
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.balance).toBe('1500000');
      });
    });

    it('should return 400 when balance format is invalid', async () => {
      await skipIfNotReady(async () => {
        // First, create an asset
        const createResponse = await makeRequest('/api/assets', 'POST', {
          name: 'Test Invalid Balance',
          type: 'bank_account',
          balance: '1000000',
          currency: 'IDR',
        });

        const created = (await createResponse.json()).data;
        createdAssetIds.push(created.id);

        // Try to update with invalid balance
        const response = await makeRequest(`/api/assets/${created.id}/balance`, 'POST', {
          balance: 'invalid',
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toBe('Validation failed');
      });
    });

    it('should return 404 for non-existent asset', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/assets/non-existent-id/balance', 'POST', {
          balance: '1000000',
        });

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.message).toBe('Asset not found');
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const response = await makeUnauthenticatedRequest('/api/assets/some-id/balance', 'POST', {
          balance: '1000000',
        });

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.message).toBe('Unauthorized');
      });
    });
  });

  describe('GET /api/assets/:id/history', () => {
    it('should get asset balance history', async () => {
      await skipIfNotReady(async () => {
        // First, create an asset
        const createResponse = await makeRequest('/api/assets', 'POST', {
          name: 'Test History Asset',
          type: 'bank_account',
          balance: '1000000',
          currency: 'IDR',
        });

        const created = (await createResponse.json()).data;
        createdAssetIds.push(created.id);

        // Update balance to create history
        await makeRequest(`/api/assets/${created.id}/balance`, 'POST', {
          balance: '1500000',
          notes: 'Balance update 1',
        });

        // Get history
        const response = await makeRequest(`/api/assets/${created.id}/history`);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.data.length).toBeGreaterThan(0);

        // Verify history structure
        const historyEntry = data.data[0];
        expect(historyEntry).toHaveProperty('id');
        expect(historyEntry).toHaveProperty('asset_id');
        expect(historyEntry).toHaveProperty('balance');
        expect(historyEntry).toHaveProperty('recorded_at');
      });
    });

    it('should return 404 for non-existent asset', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/assets/non-existent-id/history');

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.message).toBe('Asset not found');
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const response = await makeUnauthenticatedRequest('/api/assets/some-id/history');

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.message).toBe('Unauthorized');
      });
    });
  });

  describe('GET /api/assets/summary', () => {
    it('should get asset summary by currency and type', async () => {
      await skipIfNotReady(async () => {
        const response = await makeRequest('/api/assets/summary');

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('by_currency');
        expect(data.data).toHaveProperty('by_type');
        expect(Array.isArray(data.data.by_currency)).toBe(true);
        expect(Array.isArray(data.data.by_type)).toBe(true);
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      await skipIfNotReady(async () => {
        const response = await makeUnauthenticatedRequest('/api/assets/summary');

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.message).toBe('Unauthorized');
      });
    });
  });

  describe('User Isolation', () => {
    it('should not allow access to other users assets', async () => {
      await skipIfNotReady(async () => {
        // Create a second test user
        const secondUser = await db
          .insert(users)
          .values({
            id: nanoid(),
            email: 'test-isolation-assets@example.com',
            name: 'Test Isolation User',
            password_hash: 'fake-hash',
          })
          .returning();

        const secondUserId = secondUser[0].id;

        // Create an asset for the second user
        const asset = await db
          .insert(assets)
          .values({
            id: nanoid(),
            user_id: secondUserId,
            name: 'Second User Asset',
            type: 'bank_account',
            balance: '1000000',
            currency: 'IDR',
          })
          .returning();

        const assetId = asset[0].id;

        // Try to access it with the first user's session
        const response = await makeRequest(`/api/assets/${assetId}`);

        expect(response.status).toBe(404);

        // Cleanup
        await db.delete(assets).where(eq(assets.id, assetId));
        await db.delete(users).where(eq(users.id, secondUserId));
      });
    });
  });
});
