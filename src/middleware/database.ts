/**
 * Database Lifecycle Middleware
 *
 * Resets the per-request database singleton.
 * Must run before any middleware that queries the database.
 */

import type { MiddlewareHandler } from 'astro';
import { prepareForRequest } from '@/db';

export const database: MiddlewareHandler = async (_context, next) => {
  prepareForRequest();
  return next();
};
