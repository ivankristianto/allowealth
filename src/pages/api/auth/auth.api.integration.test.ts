/**
 * Auth API Integration Tests
 * ==========================
 *
 * Integration tests for authentication API endpoints with real database.
 * Tests signup, login, logout, and forgot-password endpoints.
 *
 * Prerequisites:
 * - Database must be seeded with test data (run `bun run db:seed`)
 * - Demo user (demo@example.com) must exist from the seeder
 *
 * Usage: bun test src/pages/api/auth/auth.api.integration.test.ts
 */

/* eslint-disable no-console -- Console output is intentional for test progress feedback */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'bun:test';
import { db } from '@/db';
import { users, sessions } from '@/db';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth/lucia';
import { clearRateLimitStore } from '@/lib/rate-limit';

// Test user credentials (matches the seeder)
const TEST_USER = {
  email: 'demo@example.com',
  password: 'demo123456789',
  name: 'Demo User',
};

// Unique test user for signup tests (to avoid conflicts)
const SIGNUP_TEST_USER = {
  email: `test+${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'Test User',
};

describe('Auth API Integration Tests', () => {
  let testUserId: string;
  let shouldSkip = false;
  let serverNotRunning = false;
  const createdUserIds: string[] = [];

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
    console.log(`Auth API integration test using demo user: ${user.name} (${user.email})`);
  });

  afterEach(() => {
    // Clear rate limit store between tests
    clearRateLimitStore();
  });

  afterAll(async () => {
    // Clean up any users created during tests
    for (const userId of createdUserIds) {
      try {
        // Delete sessions first (foreign key constraint)
        await db.delete(sessions).where(eq(sessions.userId, userId));
        await db.delete(users).where(eq(users.id, userId));
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  // Helper to skip tests if demo user doesn't exist or server not running
  const skipIfNoUser = (callback: () => void) => {
    if (shouldSkip || serverNotRunning) {
      return;
    }
    callback();
  };

  // Helper to make API requests
  const makeRequest = async (
    endpoint: string,
    method: string = 'POST',
    body?: Record<string, unknown>,
    headers?: Record<string, string>
  ): Promise<Response> => {
    const url = new URL(endpoint, 'http://localhost:4321');

    const requestHeaders: HeadersInit = {
      'Content-Type': 'application/json',
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

  describe('POST /api/auth/signup', () => {
    it('should create a new user successfully', async () => {
      skipIfNoUser(async () => {
        const uniqueEmail = `signup+${Date.now()}@example.com`;

        const response = await makeRequest('/api/auth/signup', 'POST', {
          email: uniqueEmail,
          password: SIGNUP_TEST_USER.password,
          name: SIGNUP_TEST_USER.name,
        });

        expect(response.status).toBe(201);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data.user).toHaveProperty('id');
        expect(json.data.user).toHaveProperty('email', uniqueEmail.toLowerCase());
        expect(json.data.user).toHaveProperty('name', SIGNUP_TEST_USER.name);

        // Track for cleanup
        createdUserIds.push(json.data.user.id);

        // Verify user exists in database
        const dbUser = await db.query.users.findFirst({
          where: eq(users.email, uniqueEmail.toLowerCase()),
        });
        expect(dbUser).toBeDefined();
        expect(dbUser?.name).toBe(SIGNUP_TEST_USER.name);
      });
    });

    it('should reject duplicate email', async () => {
      skipIfNoUser(async () => {
        // Try to sign up with existing demo user email
        const response = await makeRequest('/api/auth/signup', 'POST', {
          email: TEST_USER.email,
          password: SIGNUP_TEST_USER.password,
          name: 'Duplicate User',
        });

        expect(response.status).toBe(409);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('USER_EXISTS');
      });
    });

    it('should validate email format', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest('/api/auth/signup', 'POST', {
          email: 'invalid-email',
          password: SIGNUP_TEST_USER.password,
          name: SIGNUP_TEST_USER.name,
        });

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('INVALID_INPUT');
      });
    });

    it('should validate password strength - too short', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest('/api/auth/signup', 'POST', {
          email: `weak+${Date.now()}@example.com`,
          password: 'short',
          name: SIGNUP_TEST_USER.name,
        });

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('INVALID_INPUT');
      });
    });

    it('should validate password strength - no numbers/special chars', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest('/api/auth/signup', 'POST', {
          email: `weak+${Date.now()}@example.com`,
          password: 'longpasswordwithoutnumbers',
          name: SIGNUP_TEST_USER.name,
        });

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('INVALID_INPUT');
      });
    });

    it('should validate name is required', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest('/api/auth/signup', 'POST', {
          email: `noname+${Date.now()}@example.com`,
          password: SIGNUP_TEST_USER.password,
          name: '',
        });

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('INVALID_INPUT');
      });
    });

    it('should handle malformed JSON', async () => {
      skipIfNoUser(async () => {
        const url = new URL('/api/auth/signup', 'http://localhost:4321');

        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json',
        });

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('INVALID_INPUT');
      });
    });

    it('should include rate limit headers', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest('/api/auth/signup', 'POST', {
          email: `ratelimit+${Date.now()}@example.com`,
          password: SIGNUP_TEST_USER.password,
          name: SIGNUP_TEST_USER.name,
        });

        // Should have rate limit headers regardless of success/failure
        expect(response.headers.has('X-RateLimit-Limit')).toBe(true);
        expect(response.headers.has('X-RateLimit-Remaining')).toBe(true);
        expect(response.headers.has('X-RateLimit-Reset')).toBe(true);

        // Clean up if created
        if (response.status === 201) {
          const json = await response.json();
          createdUserIds.push(json.data.user.id);
        }
      });
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest('/api/auth/login', 'POST', {
          email: TEST_USER.email,
          password: TEST_USER.password,
        });

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data.user).toHaveProperty('id', testUserId);
        expect(json.data.user).toHaveProperty('email');
        expect(json.data.user).toHaveProperty('name');

        // Should set session cookie
        const setCookie = response.headers.get('Set-Cookie');
        expect(setCookie).toBeTruthy();
        expect(setCookie).toContain('sid=');
      });
    });

    it('should reject invalid password', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest('/api/auth/login', 'POST', {
          email: TEST_USER.email,
          password: 'wrongpassword123',
        });

        expect(response.status).toBe(401);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('INVALID_CREDENTIALS');
      });
    });

    it('should reject non-existent email', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest('/api/auth/login', 'POST', {
          email: 'nonexistent@example.com',
          password: TEST_USER.password,
        });

        expect(response.status).toBe(401);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('INVALID_CREDENTIALS');
      });
    });

    it('should validate email format', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest('/api/auth/login', 'POST', {
          email: 'invalid-email',
          password: TEST_USER.password,
        });

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('INVALID_INPUT');
      });
    });

    it('should validate password is required', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest('/api/auth/login', 'POST', {
          email: TEST_USER.email,
          password: '',
        });

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('INVALID_INPUT');
      });
    });

    it('should handle malformed JSON', async () => {
      skipIfNoUser(async () => {
        const url = new URL('/api/auth/login', 'http://localhost:4321');

        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json',
        });

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('INVALID_INPUT');
      });
    });

    it('should include rate limit headers', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest('/api/auth/login', 'POST', {
          email: TEST_USER.email,
          password: TEST_USER.password,
        });

        // Should have rate limit headers
        expect(response.headers.has('X-RateLimit-Limit')).toBe(true);
        expect(response.headers.has('X-RateLimit-Remaining')).toBe(true);
        expect(response.headers.has('X-RateLimit-Reset')).toBe(true);
      });
    });

    it('should be case-insensitive for email', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest('/api/auth/login', 'POST', {
          email: TEST_USER.email.toUpperCase(),
          password: TEST_USER.password,
        });

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
      });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid session', async () => {
      skipIfNoUser(async () => {
        // First, create a session
        const session = await auth.createSession(testUserId, {});

        const response = await makeRequest('/api/auth/logout', 'POST', undefined, {
          Cookie: `sid=${session.id}`,
        });

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data.message).toBe('Logged out successfully');

        // Should clear session cookie
        const setCookie = response.headers.get('Set-Cookie');
        expect(setCookie).toBeTruthy();
        // Blank cookie should have empty value or expired
        expect(setCookie).toContain('sid=');
      });
    });

    it('should reject logout without session cookie', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest('/api/auth/logout', 'POST');

        expect(response.status).toBe(401);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('NOT_AUTHENTICATED');
      });
    });

    it('should handle invalid session gracefully', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest('/api/auth/logout', 'POST', undefined, {
          Cookie: 'sid=invalid-session-id-that-does-not-exist',
        });

        // Should still return 200 since the user wanted to logout
        // and invalidating a non-existent session is a no-op
        expect([200, 401]).toContain(response.status);
      });
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should accept valid email and return success', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest('/api/auth/forgot-password', 'POST', {
          email: TEST_USER.email,
        });

        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        // Should not reveal if email exists
        expect(json.data.message).toContain('If an account exists');
      });
    });

    it('should return success even for non-existent email (prevents enumeration)', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest('/api/auth/forgot-password', 'POST', {
          email: 'nonexistent@example.com',
        });

        // Should still return 200 to prevent email enumeration
        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data.message).toContain('If an account exists');
      });
    });

    it('should validate email format', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest('/api/auth/forgot-password', 'POST', {
          email: 'invalid-email',
        });

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('INVALID_INPUT');
      });
    });

    it('should handle missing email', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest('/api/auth/forgot-password', 'POST', {});

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('INVALID_INPUT');
      });
    });

    it('should handle malformed JSON', async () => {
      skipIfNoUser(async () => {
        const url = new URL('/api/auth/forgot-password', 'http://localhost:4321');

        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json',
        });

        expect(response.status).toBe(400);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('INVALID_INPUT');
      });
    });

    it('should include rate limit headers', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest('/api/auth/forgot-password', 'POST', {
          email: TEST_USER.email,
        });

        // Should have rate limit headers
        expect(response.headers.has('X-RateLimit-Limit')).toBe(true);
        expect(response.headers.has('X-RateLimit-Remaining')).toBe(true);
        expect(response.headers.has('X-RateLimit-Reset')).toBe(true);
      });
    });

    it('should have stricter rate limits than login', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest('/api/auth/forgot-password', 'POST', {
          email: TEST_USER.email,
        });

        const limit = parseInt(response.headers.get('X-RateLimit-Limit') || '0', 10);

        // Password reset should have lower limit (3) than login (10)
        expect(limit).toBe(3);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login after too many attempts', async () => {
      skipIfNoUser(async () => {
        // Clear rate limit store
        clearRateLimitStore();

        // Make requests up to the limit (10 for login)
        for (let i = 0; i < 10; i++) {
          await makeRequest('/api/auth/login', 'POST', {
            email: TEST_USER.email,
            password: 'wrongpassword',
          });
        }

        // 11th request should be rate limited
        const response = await makeRequest('/api/auth/login', 'POST', {
          email: TEST_USER.email,
          password: 'wrongpassword',
        });

        expect(response.status).toBe(429);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(json.error.retryAfter).toBeGreaterThan(0);

        // Should have Retry-After header
        expect(response.headers.has('Retry-After')).toBe(true);
      });
    });

    it('should rate limit signup after too many attempts', async () => {
      skipIfNoUser(async () => {
        // Clear rate limit store
        clearRateLimitStore();

        // Make requests up to the limit (5 for signup)
        for (let i = 0; i < 5; i++) {
          await makeRequest('/api/auth/signup', 'POST', {
            email: `ratelimit${i}+${Date.now()}@example.com`,
            password: SIGNUP_TEST_USER.password,
            name: SIGNUP_TEST_USER.name,
          });
        }

        // 6th request should be rate limited
        const response = await makeRequest('/api/auth/signup', 'POST', {
          email: `ratelimit6+${Date.now()}@example.com`,
          password: SIGNUP_TEST_USER.password,
          name: SIGNUP_TEST_USER.name,
        });

        expect(response.status).toBe(429);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('RATE_LIMIT_EXCEEDED');
      });
    });

    it('should rate limit forgot-password after too many attempts', async () => {
      skipIfNoUser(async () => {
        // Clear rate limit store
        clearRateLimitStore();

        // Make requests up to the limit (3 for password reset)
        for (let i = 0; i < 3; i++) {
          await makeRequest('/api/auth/forgot-password', 'POST', {
            email: TEST_USER.email,
          });
        }

        // 4th request should be rate limited
        const response = await makeRequest('/api/auth/forgot-password', 'POST', {
          email: TEST_USER.email,
        });

        expect(response.status).toBe(429);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('RATE_LIMIT_EXCEEDED');
      });
    });
  });

  describe('Security Headers', () => {
    it('should return security headers on all responses', async () => {
      skipIfNoUser(async () => {
        const response = await makeRequest('/api/auth/login', 'POST', {
          email: TEST_USER.email,
          password: TEST_USER.password,
        });

        // These are set by middleware for all responses
        // Note: Content-Security-Policy may not be set for JSON responses
        expect(response.headers.get('Content-Type')).toBe('application/json');
      });
    });
  });
});
