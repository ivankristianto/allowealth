/**
 * Database Lifecycle Middleware
 *
 * Manages per-request database connections for Cloudflare Workers.
 *
 * In Workers, I/O objects (TCP sockets) are bound to the request context
 * that created them. Reusing a postgres.js connection from a previous
 * request throws: "Cannot perform I/O on behalf of a different request"
 *
 * This middleware:
 * 1. Discards stale connection references at request start
 * 2. Lets the db proxy lazily create a fresh connection on first access
 * 3. Closes the connection after the response is sent
 *
 * Must run after runtimeEnv (so DATABASE_URL is available)
 * and before any middleware that queries the database (auth, etc.).
 */

import type { MiddlewareHandler } from 'astro';
import { prepareForRequest, closeDatabase, getDatabaseConfig } from '@/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('database');

export const database: MiddlewareHandler = async (_context, next) => {
  const config = getDatabaseConfig();

  // D1: reset per-request but no connection lifecycle management
  // Skip verbose logging for D1 — saves CPU on string interpolation
  if (config.isD1) {
    prepareForRequest();
    return next();
  }

  log.info(
    `dialect=${config.dialect}` +
      ` url=${config.isD1 ? '<D1>' : config.url ? config.url.replace(/\/\/.*@/, '//***@') : 'MISSING'}` +
      ` supabase=${config.isSupabase}` +
      ` hyperdrive=${config.isHyperdrive}` +
      ` d1=${config.isD1}`
  );

  // Diagnostic: count fetch() calls to identify subrequest sources
  let fetchCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((...args: Parameters<typeof fetch>) => {
    fetchCount++;
    const url =
      typeof args[0] === 'string'
        ? args[0]
        : args[0] instanceof Request
          ? args[0].url
          : String(args[0]);
    log.debug(`fetch #${fetchCount}: ${url.substring(0, 120)}`);
    return originalFetch(...args);
  }) as typeof fetch;

  // SQLite: no connection lifecycle needed
  if (config.dialect !== 'postgresql') {
    globalThis.fetch = originalFetch;
    return next();
  }

  prepareForRequest();
  try {
    return await next();
  } finally {
    log.info(`total fetch subrequests: ${fetchCount}`);
    globalThis.fetch = originalFetch;
    await closeDatabase();
  }
};
