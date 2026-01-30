/**
 * User API Integration Tests
 * ===========================
 *
 * Integration tests for user API endpoints with real database.
 * Tests profile, password, and settings update endpoints.
 *
 * Prerequisites:
 * - Database must be seeded with test data (run `bun run db:seed`)
 * - Demo user (demo@example.com) must exist from the seeder
 *
 * Usage: bun test src/pages/api/user/user.api.integration.test.ts
 */

/* eslint-disable no-console -- Console output is intentional for test progress feedback */

import { describe, it, expect, beforeAll } from 'bun:test';
import { db } from '@/db';
import { users, userMeta } from '@/db';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth/lucia';
import { hashPassword } from '@/lib/auth/password';
import { USER_META_KEYS } from '@/lib/constants/user-meta-keys';

// Test user credentials (matches the seeder)
const TEST_USER = {
  email: 'demo@example.com',
  password: 'demo123456789',
  name: 'Demo User',
};

describe('User API Integration Tests', () => {
  let testUserId: string;
  let sessionId: string;
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
  });

  // Helper to skip tests if demo user doesn't exist
  const skipIfNoUser = async (callback: () => Promise<void>) => {
    if (shouldSkip) {
      return;
    }
    await callback();
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

    // Note: This uses native fetch and will make actual HTTP requests
    // In a test environment, we'd typically mock or use a test server
    return fetch(url.toString(), options);
  };

  describe('GET /api/user/profile', () => {
    it('should return current user profile', async () => {
      await skipIfNoUser(async () => {
        const response = await makeRequest('/api/user/profile', 'GET');

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data).toHaveProperty('id', testUserId);
        expect(json.data).toHaveProperty('name');
        expect(json.data).toHaveProperty('email');
      });
    });

    it('should reject requests without authentication', async () => {
      await skipIfNoUser(async () => {
        const url = new URL('/api/user/profile', 'http://localhost:4321');

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        expect(response.status).toBe(401);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });
  });

  describe('GET /api/user/meta', () => {
    it('should return all user meta values', async () => {
      await skipIfNoUser(async () => {
        const response = await makeRequest('/api/user/meta', 'GET');

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data).toHaveProperty('currency');
        expect(json.data).toHaveProperty('show_converted_totals');
        expect(json.data).toHaveProperty('show_individual_currencies');
      });
    });

    it('should return default values when meta does not exist', async () => {
      await skipIfNoUser(async () => {
        // Delete existing meta
        await db.delete(userMeta).where(eq(userMeta.user_id, testUserId));

        const response = await makeRequest('/api/user/meta', 'GET');

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data.currency).toBe('IDR');
        expect(json.data.show_converted_totals).toBe('true');
        expect(json.data.show_individual_currencies).toBe('true');
      });
    });

    it('should reject requests without authentication', async () => {
      await skipIfNoUser(async () => {
        const url = new URL('/api/user/meta', 'http://localhost:4321');

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        expect(response.status).toBe(401);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });
  });

  describe('PUT /api/user/profile', () => {
    it('should update user name and email', async () => {
      await skipIfNoUser(async () => {
        const newName = `Updated ${TEST_USER.name}`;
        const newEmail = `updated+${Date.now()}@example.com`;

        const response = await makeRequest('/api/user/profile', 'PUT', {
          name: newName,
          email: newEmail,
        });

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data).toHaveProperty('id', testUserId);
        expect(json.data.name).toBe(newName);
        expect(json.data.email).toBe(newEmail);

        // Verify in database
        const user = await db.query.users.findFirst({
          where: eq(users.id, testUserId),
        });
        expect(user?.name).toBe(newName);
        expect(user?.email).toBe(newEmail);

        // Restore original values
        await db
          .update(users)
          .set({
            name: TEST_USER.name,
            email: TEST_USER.email,
          })
          .where(eq(users.id, testUserId));
      });
    });

    it('should reject duplicate email', async () => {
      await skipIfNoUser(async () => {
        // First, create a temporary user
        const tempUserEmail = `temp+${Date.now()}@example.com`;
        const tempUserId = `temp-user-${Date.now()}`;
        const passwordHash = await hashPassword('TempPassword123!');

        const [tempUser] = await db
          .insert(users)
          .values({
            id: tempUserId,
            email: tempUserEmail,
            name: 'Temp User',
            password_hash: passwordHash,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning();

        // Try to update demo user to use the same email
        const response = await makeRequest('/api/user/profile', 'PUT', {
          name: TEST_USER.name,
          email: tempUserEmail,
        });

        expect(response.status).toBe(409);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('EMAIL_ALREADY_EXISTS');

        // Clean up temp user
        await db.delete(users).where(eq(users.id, tempUser.id));
      });
    });

    it('should validate required fields', async () => {
      await skipIfNoUser(async () => {
        const response = await makeRequest('/api/user/profile', 'PUT', {
          name: '',
          email: 'invalid-email',
        });

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('VALIDATION_ERROR');
        expect(json.error.details).toBeInstanceOf(Array);
      });
    });

    it('should reject requests without authentication', async () => {
      await skipIfNoUser(async () => {
        const url = new URL('/api/user/profile', 'http://localhost:4321');

        const response = await fetch(url.toString(), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Test', email: 'test@example.com' }),
        });

        expect(response.status).toBe(401);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });
  });

  describe('PUT /api/user/password', () => {
    it('should update password with valid old password', async () => {
      await skipIfNoUser(async () => {
        const newPassword = `NewPassword${Date.now()}123!`;

        const response = await makeRequest('/api/user/password', 'PUT', {
          oldPassword: TEST_USER.password,
          newPassword: newPassword,
        });

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data).toHaveProperty('success', true);

        // Restore original password
        const originalHash = await hashPassword(TEST_USER.password);
        await db
          .update(users)
          .set({
            password_hash: originalHash,
          })
          .where(eq(users.id, testUserId));
      });
    });

    it('should reject invalid old password', async () => {
      await skipIfNoUser(async () => {
        const response = await makeRequest('/api/user/password', 'PUT', {
          oldPassword: 'wrongpassword',
          newPassword: 'NewPassword123!',
        });

        expect(response.status).toBe(401);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('INVALID_PASSWORD');
      });
    });

    it('should validate password strength', async () => {
      await skipIfNoUser(async () => {
        // Test weak password (too short)
        const response1 = await makeRequest('/api/user/password', 'PUT', {
          oldPassword: TEST_USER.password,
          newPassword: 'short',
        });

        expect(response1.status).toBe(400);

        const json1 = await response1.json();
        expect(json1.success).toBe(false);
        expect(json1.error.code).toBe('VALIDATION_ERROR');

        // Test weak password (no numbers/special chars)
        const response2 = await makeRequest('/api/user/password', 'PUT', {
          oldPassword: TEST_USER.password,
          newPassword: 'longbutweakpassword',
        });

        expect(response2.status).toBe(400);

        const json2 = await response2.json();
        expect(json2.success).toBe(false);
      });
    });

    it('should reject requests without authentication', async () => {
      await skipIfNoUser(async () => {
        const url = new URL('/api/user/password', 'http://localhost:4321');

        const response = await fetch(url.toString(), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oldPassword: 'old',
            newPassword: 'NewPassword123!',
          }),
        });

        expect(response.status).toBe(401);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });
  });

  describe('PUT /api/user/meta/:key', () => {
    it('should update currency meta value', async () => {
      await skipIfNoUser(async () => {
        const response = await makeRequest(`/api/user/meta/${USER_META_KEYS.CURRENCY}`, 'PUT', {
          value: 'USD',
        });

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data.value).toBe('USD');

        // Verify in database
        const meta = await db.query.userMeta.findFirst({
          where: eq(userMeta.user_id, testUserId),
        });
        expect(meta?.meta_value).toBe('USD');

        // Restore original
        await makeRequest(`/api/user/meta/${USER_META_KEYS.CURRENCY}`, 'PUT', { value: 'IDR' });
      });
    });

    it('should update display preferences', async () => {
      await skipIfNoUser(async () => {
        const response = await makeRequest(
          `/api/user/meta/${USER_META_KEYS.SHOW_CONVERTED_TOTALS}`,
          'PUT',
          { value: 'false' }
        );

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data.value).toBe('false');

        // Restore defaults
        await makeRequest(`/api/user/meta/${USER_META_KEYS.SHOW_CONVERTED_TOTALS}`, 'PUT', {
          value: 'true',
        });
      });
    });

    it('should create meta if it does not exist', async () => {
      await skipIfNoUser(async () => {
        // Delete existing meta
        await db.delete(userMeta).where(eq(userMeta.user_id, testUserId));

        const response = await makeRequest(`/api/user/meta/${USER_META_KEYS.CURRENCY}`, 'PUT', {
          value: 'USD',
        });

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data.value).toBe('USD');

        // Verify meta was created
        const meta = await db.query.userMeta.findFirst({
          where: eq(userMeta.user_id, testUserId),
        });
        expect(meta).toBeDefined();
        expect(meta?.meta_value).toBe('USD');
      });
    });

    it('should validate currency values', async () => {
      await skipIfNoUser(async () => {
        const response = await makeRequest(
          `/api/user/meta/${USER_META_KEYS.CURRENCY}`,
          'PUT',
          { value: 'EUR' } // Invalid currency
        );

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('VALIDATION_ERROR');
      });
    });

    it('should reject requests without authentication', async () => {
      await skipIfNoUser(async () => {
        const url = new URL(`/api/user/meta/${USER_META_KEYS.CURRENCY}`, 'http://localhost:4321');

        const response = await fetch(url.toString(), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: 'USD' }),
        });

        expect(response.status).toBe(401);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      await skipIfNoUser(async () => {
        const url = new URL('/api/user/profile', 'http://localhost:4321');

        const response = await fetch(url.toString(), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Cookie: `sid=${sessionId}` },
          body: 'invalid json',
        });

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });

    it('should handle empty request body', async () => {
      await skipIfNoUser(async () => {
        const response = await makeRequest('/api/user/profile', 'PUT');

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
      });
    });
  });
});
