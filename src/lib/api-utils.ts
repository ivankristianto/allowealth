import type { APIContext } from 'astro';
import { z } from 'zod';

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
 */
export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: { issues: any[] } }> {
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
              code: 'invalid_json',
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
            code: 'parse_error',
            message: 'Failed to parse request body',
            path: [],
          },
        ],
      },
    };
  }
}

/**
 * Get user ID from session (placeholder for now - will be implemented with auth)
 * TODO: Replace with actual auth implementation
 */
export function getUserId(context: APIContext): string | null {
  // Placeholder: In production, this will extract user_id from session/JWT
  // For now, return a test user ID
  return 'test-user-id';
}

/**
 * Require authentication middleware
 */
export function requireAuth(context: APIContext): string {
  const userId = getUserId(context);
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
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
 */
export function getPaginationParams(url: URL): { limit: number; offset: number } {
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  return {
    limit: Math.min(Math.max(limit, 1), 100), // Limit between 1-100
    offset: Math.max(offset, 0),
  };
}

/**
 * Validate that a date is valid (not Invalid Date)
 */
export function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}
