import type { APIContext } from 'astro';
import { z } from 'zod';
import { auth } from '@/lib/auth/lucia';

/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

/**
 * Result of validateBody - success case
 */
export interface ValidationResultSuccess<T> {
  success: true;
  data: T;
}

/**
 * Result of validateBody - error case
 * Using z.ZodError['issues'] type for Zod v4 compatibility
 */
export interface ValidationError {
  success: false;
  error: {
    issues: z.ZodError['issues'];
  };
}

/**
 * Union type for validateBody return value
 */
export type ValidationResult<T> = ValidationResultSuccess<T> | ValidationError;

/**
 * Type guard to check if validation failed
 * Use this to access error.issues without type assertions
 *
 * @example
 * ```typescript
 * const validation = await validateBody(request, schema);
 * if (isValidationError(validation)) {
 *   // TypeScript knows validation.error.issues exists here
 *   return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
 * }
 * ```
 */
export function isValidationError<T>(result: ValidationResult<T>): result is ValidationError {
  return result.success === false;
}

/**
 * Create success response
 */
export function successResponse<T>(data: T, status = 200): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
    } as ApiResponse<T>),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Create error response
 */
export function errorResponse(
  message: string,
  status = 400,
  code?: string,
  details?: any
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        message,
        code,
        details,
      },
    } as ApiResponse),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Validate request body with Zod schema
 *
 * @param request - The HTTP request object
 * @param schema - Zod schema to validate against
 * @returns ValidationResult with either data (success) or ZodIssue[] (failure)
 *
 * @example
 * ```typescript
 * const validation = await validateBody(context.request, mySchema);
 * if (isValidationError(validation)) {
 *   return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
 * }
 * // validation.data is available here
 * ```
 */
export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: { issues: error.issues } };
    }
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: {
          issues: [
            {
              code: 'custom' as const,
              message: 'Invalid JSON in request body',
              path: [],
            },
          ],
        },
      };
    }
    // Handle other JSON parsing errors
    return {
      success: false,
      error: {
        issues: [
          {
            code: 'custom' as const,
            message: 'Failed to parse request body',
            path: [],
          },
        ],
      },
    };
  }
}

/**
 * Authenticated user context returned by getAuthenticatedUser
 */
export interface AuthenticatedUser {
  userId: string;
  workspaceId: string;
  role: 'admin' | 'member';
}

/**
 * Get authenticated user from middleware-validated session
 *
 * Uses the user data already validated and set by middleware in `context.locals.user`.
 * This avoids redundant database calls since the middleware has already validated
 * the session.
 *
 * @param context - Astro API context with locals set by middleware
 * @returns AuthenticatedUser object with userId, workspaceId, and role
 * @throws Error with message 'Unauthorized' if not authenticated
 *
 * @example
 * ```typescript
 * export const GET: APIRoute = async (context) => {
 *   try {
 *     const auth = getAuthenticatedUser(context);
 *     // auth.userId, auth.workspaceId, auth.role are now available
 *     await service.findAll(auth.workspaceId);
 *   } catch (error) {
 *     if (error instanceof Error && error.message === 'Unauthorized') {
 *       return errorResponse('Unauthorized', 401);
 *     }
 *     throw error;
 *   }
 * }
 * ```
 */
export function getAuthenticatedUser(context: APIContext): AuthenticatedUser {
  const user = context.locals.user;

  if (!user?.id || !user?.workspaceId) {
    throw new Error('Unauthorized');
  }

  return {
    userId: user.id,
    workspaceId: user.workspaceId,
    role: user.role,
  };
}

/**
 * Get user ID from Lucia session cookie
 *
 * @deprecated Use `getAuthenticatedUser(context)` instead. This function makes
 * a redundant database call since the middleware already validates the session
 * and sets `context.locals.user`.
 *
 * Extracts the session ID from the request cookies and validates it
 * using Lucia's validateSession method. Returns the user ID if the
 * session is valid, null otherwise.
 *
 * @param context - Astro API context containing request cookies
 * @returns User ID string if session is valid, null otherwise
 */
export async function getUserId(context: APIContext): Promise<string | null> {
  // Extract session ID from cookies using Lucia's cookie name
  const sessionId = context.cookies.get(auth.sessionCookieName)?.value;

  // No session cookie found
  if (!sessionId) {
    return null;
  }

  try {
    // Validate session using Lucia
    const { session, user } = await auth.validateSession(sessionId);

    // Session is invalid or expired
    if (!session || !user) {
      return null;
    }

    // Return user ID from valid session
    return user.id;
  } catch {
    // Session validation failed (invalid token, database error, etc.)
    return null;
  }
}

/**
 * Require authentication for API routes
 *
 * @deprecated Use `getAuthenticatedUser(context)` instead. This function makes
 * a redundant database call since the middleware already validates the session
 * and sets `context.locals.user`.
 *
 * Validates the session and returns the user ID. Throws an error
 * if the user is not authenticated. This error should be caught
 * by the route handler and returned as a 401 response.
 *
 * @param context - Astro API context containing request cookies
 * @returns User ID string (never null for authenticated requests)
 * @throws Error with message 'Unauthorized' if not authenticated
 */
export async function requireAuth(context: APIContext): Promise<string> {
  // Use getAuthenticatedUser to avoid redundant database call
  const auth = getAuthenticatedUser(context);
  return auth.userId;
}

/**
 * Parse query parameters
 */
export function getQueryParams(url: URL): Record<string, string> {
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

/**
 * Parse pagination params
 * Normal requests are capped at 100 items.
 * Internal requests (with _internal=true) are capped at 10000 for caching purposes.
 */
export function getPaginationParams(url: URL): { limit: number; offset: number } {
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);
  const isInternal = url.searchParams.get('_internal') === 'true';

  // Internal requests (for caching) allow higher limits
  const maxLimit = isInternal ? 10000 : 100;

  return {
    limit: Math.min(Math.max(limit, 1), maxLimit),
    offset: Math.max(offset, 0),
  };
}

/**
 * Validate that a date is valid (not Invalid Date)
 */
export function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}
