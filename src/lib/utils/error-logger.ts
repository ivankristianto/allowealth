/**
 * Error Logger with Sanitization
 *
 * Provides safe error logging that prevents internal error details
 * (stack traces, internal paths, database details) from being exposed
 * in console.error logs.
 *
 * Sensitive patterns that are sanitized:
 * - File paths (e.g., /Users/ivan/Works/AI/expenses/src/...)
 * - Stack traces
 * - Database error details
 * - SQL queries
 * - Internal error codes that expose implementation details
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('error');

/**
 * Sensitive patterns to strip from error messages
 */
const SENSITIVE_PATTERNS = [
  // File paths
  /\/?[\w\/]+\/(src|lib|services|pages|db)\/[\w\/\-\.]+/gi,
  // Stack trace line numbers and file references
  /\s+at\s+[\w\.<>]+(\/[\w\/\-\.]+)?:\d+:\d+/g,
  // Database connection strings and credentials
  /(mysql|postgres|sqlite):\/\/[^:]+:[^@]+@[^/]+\/\w+/gi,
  // SQL error details
  /SQL(Error|ITE)?[_ ]?(ERROR)?[:\s]?.{1,100}?(?=[\s\n]|$)/gi,
  // Drizzle/Database error codes
  /constraint\s+\w+\s+violation/gi,
  /UNIQUE\s+constraint\s+failed/gi,
  // Internal error codes that expose implementation
  /ERR_(INTERNAL|DATABASE|CONFIG)_[A-Z0-9_]+/gi,
  // Node.js internal errors
  /Node\.js\s+\d+\s+mb_rss=\d+/g,
  // Heap size information
  /heap\s+total=\d+,\s+used=\d+/g,
];

/**
 * Known internal error messages to sanitize
 */
const INTERNAL_ERROR_MESSAGES = [
  'undefined',
  'null',
  '[object Object]',
  'constructor',
  'prototype',
  '__proto__',
];

/**
 * Sanitized error information for logging
 */
export interface SanitizedError {
  /** Safe error message (generic, no internal details) */
  message: string;
  /** Error name/type (e.g., 'Error', 'TypeError') */
  name: string;
  /** Whether the error is a known error type or unknown */
  isKnownError: boolean;
  /** Additional context about where the error occurred (without paths) */
  context?: string;
}

/**
 * Sanitize an error for safe logging
 *
 * @param error - The error to sanitize
 * @param context - Optional context about where the error occurred
 * @returns Sanitized error information safe for logging
 */
export function sanitizeError(error: unknown, context?: string): SanitizedError {
  // Handle null/undefined
  if (error === null || error === undefined) {
    return {
      message: 'An unknown error occurred',
      name: 'UnknownError',
      isKnownError: false,
      context,
    };
  }

  // Extract error properties
  let errorMessage: string;
  let errorName: string;
  let errorStack: string | undefined;

  if (error instanceof Error) {
    errorMessage = error.message;
    errorName = error.name;
    errorStack = error.stack;
  } else if (typeof error === 'string') {
    errorMessage = error;
    errorName = 'Error';
  } else if (typeof error === 'object') {
    // Handle objects that might be error-like
    const errorObj = error as Record<string, unknown>;
    errorMessage = String(errorObj.message ?? errorObj.error ?? JSON.stringify(error));
    errorName = String(errorObj.name ?? errorObj.code ?? 'Error');
  } else {
    errorMessage = String(error);
    errorName = 'Error';
  }

  // Sanitize the message
  let sanitizedMessage = sanitizeString(errorMessage);

  // If the sanitized message is empty or too short, use a generic one
  if (!sanitizedMessage || sanitizedMessage.length < 3) {
    sanitizedMessage = 'An unexpected error occurred';
  }

  // Check if it's a known/safe error type
  const knownErrorNames = [
    'Error',
    'TypeError',
    'RangeError',
    'ReferenceError',
    'SyntaxError',
    'EvalError',
    'URIError',
  ];
  const isKnownError = knownErrorNames.includes(errorName) || !errorStack;

  // Sanitize stack trace if present (but keep the error type)
  if (errorStack) {
    // Remove file paths from stack trace, keeping only the function names
    errorStack
      .replace(/\/?[\w\/]+\/(src|lib|services|pages|db)\/[\w\/\-\.]+/g, (match) => {
        // Extract just the filename from the path
        const parts = match.split('/');
        return parts[parts.length - 1] || 'unknown';
      })
      .replace(/\s+at\s+/g, '\n  at ');

    // Don't expose stack traces in production-like logs
    // Include only the error type in the message
    sanitizedMessage = sanitizedMessage;
  }

  return {
    message: sanitizedMessage,
    name: errorName,
    isKnownError,
    context,
  };
}

/**
 * Sanitize a string by removing sensitive patterns
 */
function sanitizeString(input: string): string {
  let result = input;

  // Apply all patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }

  // Normalize whitespace
  result = result.replace(/\s+/g, ' ').trim();

  // Check for internal error messages
  if (INTERNAL_ERROR_MESSAGES.includes(result.toLowerCase())) {
    return 'An internal error occurred';
  }

  return result;
}

/**
 * Log an error safely to console
 *
 * @param message - Context message describing what failed
 * @param error - The error to log (will be sanitized)
 */
export function logError(message: string, error: unknown): void {
  // Skip logging in test environment to avoid noisy output
  if (import.meta.env.MODE === 'test') {
    return;
  }

  const sanitized = sanitizeError(error, message);

  // Build the log message
  const logParts = [`[${sanitized.name}] ${sanitized.message}`];

  // Add context if provided
  if (sanitized.context) {
    logParts.push(`Context: ${sanitized.context}`);
  }

  // Log via structured logger (sanitized)
  log.error(logParts.join(' | '));
}

/**
 * Create a safe error message for logging without exposing details
 *
 * @param error - The error to get a safe message from
 * @returns A safe, generic error message
 */
export function getSafeErrorMessage(error: unknown): string {
  const sanitized = sanitizeError(error);
  return sanitized.message;
}
