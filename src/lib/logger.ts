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

import { createConsola, type LogObject } from 'consola/core';

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'development';

/**
 * JSON reporter for production — outputs structured JSON that
 * Cloudflare Workers Logs auto-indexes for querying.
 */
const jsonReporter = {
  log(logObj: LogObject) {
    const entry: Record<string, unknown> = {
      level: logObj.type,
      tag: logObj.tag || undefined,
      message: logObj.args.map(String).join(' '),
      timestamp: new Date().toISOString(),
    };

    // Clean undefined values
    Object.keys(entry).forEach((k) => entry[k] === undefined && delete entry[k]);

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
    const message = logObj.args.map(String).join(' ');
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
  level: isDev ? 4 : 3, // debug in dev, info in prod
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
