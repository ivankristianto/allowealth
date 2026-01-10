/**
 * API Response Types
 *
 * Standardized types for all API responses.
 * Ensures consistency across all endpoints.
 *
 * Response format:
 * - Success: { success: true, data?: T }
 * - Error: { success: false, error: { code: string, message: string } }
 */

/**
 * API Error Response
 * Used when an operation fails
 */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

/**
 * API Success Response with data
 * Used when an operation succeeds and returns data
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

/**
 * API Success Response without data
 * Used when an operation succeeds but doesn't return data
 */
export interface ApiSuccess {
  success: true;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiError;

/**
 * Common error codes
 */
export const API_ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_EXISTS: 'USER_EXISTS',

  // Input validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // Server errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',

  // Session errors
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
} as const;

/**
 * Type for error code values
 */
export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/**
 * Helper function to create an error response
 */
export function createErrorResponse(code: string, message: string): ApiError {
  return {
    success: false,
    error: { code, message },
  };
}

/**
 * Helper function to create a success response
 */
export function createSuccessResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Helper function to create a success response without data
 */
export function createSuccess(): ApiSuccess {
  return {
    success: true,
  };
}
