/**
 * Database Lifecycle Middleware
 *
 * Resets per-request database singleton for Cloudflare Workers.
 * Must run before any middleware that queries the database.
 */

import type { MiddlewareHandler } from 'astro';
import { prepareForRequest } from '@/db';

export const database: MiddlewareHandler = async (_context, next) => {
  prepareForRequest();
  return next();
};
