/**
 * API Utils Tests
 *
 * Tests for the API utility functions:
 * - getAuthenticatedUser: Get user ID from middleware-validated session
 */

import { describe, test, expect } from 'bun:test';
import type { APIContext } from 'astro';
import { getAuthenticatedUser } from './api-utils';

/**
 * Create a mock APIContext for testing
 */
function createMockContext(user: { id: string; email: string; name: string } | null): APIContext {
  return {
    locals: {
      user,
      session: user
        ? { id: 'session-123', userId: user.id, expiresAt: new Date(), fresh: false }
        : null,
    },
    // Add minimal required properties for APIContext
    request: new Request('http://localhost/api/test'),
    url: new URL('http://localhost/api/test'),
    params: {},
    cookies: {
      get: () => undefined,
      set: () => {},
      delete: () => {},
      has: () => false,
      headers: () => new Headers(),
    },
    redirect: () => new Response(null, { status: 302 }),
    rewrite: () => new Request('http://localhost/api/test'),
    clientAddress: '127.0.0.1',
    site: new URL('http://localhost'),
    generator: 'Astro',
    props: {},
    routePattern: '/api/test',
    isPrerendered: false,
    currentLocale: undefined,
    preferredLocale: undefined,
    preferredLocaleList: undefined,
    getActionResult: () => undefined,
    callAction: async () => ({ data: undefined, error: undefined }),
    originPathname: '/api/test',
  } as unknown as APIContext;
}

describe('getAuthenticatedUser', () => {
  describe('when user is authenticated', () => {
    test('returns user ID from context.locals.user', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };
      const context = createMockContext(mockUser);

      const userId = getAuthenticatedUser(context);

      expect(userId).toBe('user-123');
    });

    test('returns correct user ID for different users', () => {
      const user1 = { id: 'abc-def', email: 'user1@test.com', name: 'User One' };
      const user2 = { id: 'xyz-789', email: 'user2@test.com', name: 'User Two' };

      expect(getAuthenticatedUser(createMockContext(user1))).toBe('abc-def');
      expect(getAuthenticatedUser(createMockContext(user2))).toBe('xyz-789');
    });
  });

  describe('when user is not authenticated', () => {
    test('throws "Unauthorized" error when user is null', () => {
      const context = createMockContext(null);

      expect(() => getAuthenticatedUser(context)).toThrow('Unauthorized');
    });

    test('throws "Unauthorized" error when locals.user is undefined', () => {
      const context = {
        locals: {},
        request: new Request('http://localhost/api/test'),
        url: new URL('http://localhost/api/test'),
      } as unknown as APIContext;

      expect(() => getAuthenticatedUser(context)).toThrow('Unauthorized');
    });

    test('throws "Unauthorized" error when user.id is missing', () => {
      // P2: Edge case - user object exists but id is missing/undefined
      const context = {
        locals: {
          user: { email: 'test@example.com', name: 'Test' }, // missing id
        },
        request: new Request('http://localhost/api/test'),
        url: new URL('http://localhost/api/test'),
      } as unknown as APIContext;

      expect(() => getAuthenticatedUser(context)).toThrow('Unauthorized');
    });
  });

  describe('error handling', () => {
    test('throws Error instance with message "Unauthorized"', () => {
      const context = createMockContext(null);

      try {
        getAuthenticatedUser(context);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Unauthorized');
      }
    });

    test('error can be caught and checked as expected in API routes', () => {
      const context = createMockContext(null);

      // This mimics how API routes catch and handle the error
      let caught = false;
      try {
        getAuthenticatedUser(context);
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          caught = true;
        }
      }

      expect(caught).toBe(true);
    });
  });
});
