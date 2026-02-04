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

export const database: MiddlewareHandler = async (_context, next) => {
  const config = getDatabaseConfig();

  // Diagnostic: log DB config and count fetch subrequests
  console.log(
    `[database] dialect=${config.dialect} url=${config.url ? config.url.replace(/\/\/.*@/, '//***@') : 'MISSING'} supabase=${config.isSupabase}`
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
    console.log(`[fetch #${fetchCount}] ${url.substring(0, 120)}`);
    return originalFetch(...args);
  }) as typeof fetch;

  // Only manage connection lifecycle for PostgreSQL (Workers/production).
  // SQLite connections are file-based and safe to reuse.
  if (config.dialect !== 'postgresql') {
    globalThis.fetch = originalFetch;
    return next();
  }

  prepareForRequest();

  try {
    return await next();
  } finally {
    console.log(`[database] Total fetch subrequests: ${fetchCount}`);
    globalThis.fetch = originalFetch;
    await closeDatabase();
  }
};
