/**
 * Structured Logger
 *
 * Wraps consola to provide tagged, leveled logging that outputs
 * structured JSON in production (for Cloudflare Workers Logs)
 * and pretty-printed output in development.
 *
 * Usage:
 *   import { createLogger } from '@/lib/logger';
 *   const log = createLogger('database');
 *   log.info('connection established');
 *   log.error('query failed', error);
 *
 * Workers Logs automatically captures console.* output and
 * indexes JSON fields for querying in the Cloudflare dashboard.
 */

/* eslint-disable no-console -- Logger is the console wrapper; direct console calls are intentional */
import { createConsola, type LogObject } from 'consola/core';
import { getEnv } from '@/lib/env';

const isDev =
  (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'development') ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');
// Bun test does not set import.meta.env.MODE; it sets process.env.NODE_ENV instead.
const isTest =
  (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') ||
  (typeof process !== 'undefined' &&
    (process.env?.NODE_ENV === 'test' || process.env?.BUN_ENV === 'test'));

/**
 * Map standard log level names to consola numeric levels.
 * Consola levels: 0=fatal/error, 1=warn, 2=log, 3=info, 4=debug, 5=trace
 */
const LOG_LEVEL_MAP: Record<string, number> = {
  silent: -999,
  fatal: 0,
  error: 0,
  warn: 1,
  log: 2,
  info: 3,
  debug: 4,
  trace: 5,
  verbose: 5,
};

export function resolveLogLevel(): number {
  const envLevel = getEnv('LOG_LEVEL');
  if (envLevel && envLevel.toLowerCase() in LOG_LEVEL_MAP) {
    return LOG_LEVEL_MAP[envLevel.toLowerCase()];
  }
  // Dev/test: debug (4) — show everything for diagnostics
  // Production: warn (1) — only warn/error/fatal
  return isDev || isTest ? 4 : 1;
}

/**
 * JSON reporter for production — outputs structured JSON that
 * Cloudflare Workers Logs auto-indexes for querying.
 */
/** Stringify a log argument — objects get JSON-serialized, everything else String() */
function stringifyArg(arg: unknown): string {
  if (arg === null || arg === undefined) return String(arg);
  if (typeof arg === 'object') {
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

const jsonReporter = {
  log(logObj: LogObject) {
    const entry: Record<string, unknown> = {
      level: logObj.type,
      tag: logObj.tag || undefined,
      message: logObj.args.map(stringifyArg).join(' '),
      timestamp: new Date().toISOString(),
    };

    // Clean undefined values
    Object.keys(entry).forEach((k) => {
      if (entry[k] === undefined) delete entry[k];
    });

    const json = JSON.stringify(entry);

    // Route to appropriate console method so Workers Logs captures severity
    switch (logObj.type) {
      case 'error':
      case 'fatal':
        console.error(json);
        break;
      case 'warn':
        console.warn(json);
        break;
      default:
        console.log(json);
    }
  },
};

/**
 * Pretty reporter for development — human-readable bracket-prefixed output.
 * Matches the existing [ServiceName] convention used across the codebase.
 */
const prettyReporter = {
  log(logObj: LogObject) {
    const prefix = logObj.tag ? `[${logObj.tag}]` : '';
    const message = logObj.args.map(stringifyArg).join(' ');
    const output = prefix ? `${prefix} ${message}` : message;

    switch (logObj.type) {
      case 'error':
      case 'fatal':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'debug':
      case 'trace':
        console.log(output);
        break;
      default:
        console.log(output);
    }
  },
};

/**
 * Base consola instance with environment-appropriate reporter.
 */
const baseLogger = createConsola({
  reporters: [isDev ? prettyReporter : jsonReporter],
  level: resolveLogLevel(),
});

/**
 * Create a tagged logger for a specific module/service.
 *
 * @param tag - Module identifier (e.g., 'database', 'auth', 'cache')
 * @returns A consola instance with the tag set
 *
 * @example
 * const log = createLogger('database');
 * log.info('dialect=postgresql hyperdrive=true');
 * log.error('connection failed', error);
 */
export function createLogger(tag: string) {
  return baseLogger.withTag(tag);
}

/**
 * Root logger instance (no tag) for one-off logging.
 * Prefer createLogger('tag') for module-specific logging.
 */
export const logger = baseLogger;

// ---------------------------------------------------------------------------
// Error logging with sanitization
// ---------------------------------------------------------------------------

const errorLog = baseLogger.withTag('error');

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
  errorLog.error(logParts.join(' | '));
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
