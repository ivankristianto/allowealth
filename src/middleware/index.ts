/**
 * Middleware Composition
 *
 * Chains middleware handlers in sequence. Each handler has a single responsibility.
 * Order matters: earlier middleware wraps later ones (onion model).
 *
 * @see https://docs.astro.build/en/guides/middleware/#chaining-middleware
 */

import { sequence } from 'astro:middleware';
import { database } from './database';
import { installerGuard } from './installer';
import { perfDebug } from './perf-debug';
import { securityHeaders } from './security-headers';
import { authentication } from './auth';
import { csrf } from './csrf';
import { routeGuard } from './route-guard';

export const onRequest = sequence(
  database,
  installerGuard,
  perfDebug,
  securityHeaders,
  authentication,
  csrf,
  routeGuard
);
