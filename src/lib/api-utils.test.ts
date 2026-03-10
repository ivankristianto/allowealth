/**
 * API Utils Tests
 *
 * Tests for the API utility functions:
 * - getAuthenticatedUser: Get user ID from middleware-validated session
 */

import { describe, test, expect } from 'bun:test';
import type { APIContext } from 'astro';
import { minLength, object, pipe, string } from 'valibot';
import { getAuthenticatedUser, isValidationError, validateBody } from './api-utils';

/**
 * Create a mock APIContext for testing
 */
function createMockContext(
  user: {
    id: string;
    email: string;
    name: string;
    workspaceId: string;
    role: 'admin' | 'member';
  } | null
): APIContext {
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
    test('returns AuthenticatedUser from context.locals.user', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        workspaceId: 'workspace-123',
        role: 'admin' as const,
      };
      const context = createMockContext(mockUser);

      const authUser = getAuthenticatedUser(context);

      expect(authUser.userId).toBe('user-123');
      expect(authUser.workspaceId).toBe('workspace-123');
      expect(authUser.role).toBe('admin');
    });

    test('returns correct user data for different users', () => {
      const user1 = {
        id: 'abc-def',
        email: 'user1@test.com',
        name: 'User One',
        workspaceId: 'ws-1',
        role: 'admin' as const,
      };
      const user2 = {
        id: 'xyz-789',
        email: 'user2@test.com',
        name: 'User Two',
        workspaceId: 'ws-2',
        role: 'member' as const,
      };

      const authUser1 = getAuthenticatedUser(createMockContext(user1));
      expect(authUser1.userId).toBe('abc-def');
      expect(authUser1.workspaceId).toBe('ws-1');

      const authUser2 = getAuthenticatedUser(createMockContext(user2));
      expect(authUser2.userId).toBe('xyz-789');
      expect(authUser2.workspaceId).toBe('ws-2');
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

describe('validateBody', () => {
  const schema = object({
    name: pipe(string(), minLength(1, 'Name is required')),
  });

  test('returns normalized issue details when request JSON is invalid', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{',
    });

    const validation = await validateBody(request, schema);

    expect(isValidationError(validation)).toBe(true);

    if (!isValidationError(validation)) {
      throw new Error('Expected validation failure');
    }

    expect(validation.error.issues).toEqual([
      {
        path: [],
        message: 'Invalid JSON in request body',
        code: 'custom',
      },
    ]);
  });

  test('returns repo-owned validation issue details for schema failures', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: '' }),
    });

    const validation = await validateBody(request, schema);

    expect(isValidationError(validation)).toBe(true);

    if (!isValidationError(validation)) {
      throw new Error('Expected validation failure');
    }

    expect(validation.error.issues).toHaveLength(1);
    expect(validation.error.issues[0]?.path).toEqual(['name']);
    expect(validation.error.issues[0]?.message).toBe('Name is required');
    expect(validation.error.issues[0]?.code).toBeString();
  });

  test('returns parsed typed data for valid input', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Alice' }),
    });

    const validation = await validateBody(request, schema);

    expect(validation.success).toBe(true);

    if (isValidationError(validation)) {
      throw new Error('Expected validation success');
    }

    const parsedName: string = validation.data.name;
    expect(parsedName).toBe('Alice');
    expect(validation.data).toEqual({ name: 'Alice' });
  });
});
