/**
 * Middleware Composition
 *
 * Chains middleware handlers in sequence. Each handler has a single responsibility.
 * Order matters: earlier middleware wraps later ones (onion model).
 *
 * @see https://docs.astro.build/en/reference/middleware-reference/
 */

import { sequence } from 'astro:middleware';
import { runtimeEnv } from './runtime-env';
import { perfDebug } from './perf-debug';
import { securityHeaders } from './security-headers';
import { authentication } from './auth';
import { csrf } from './csrf';
import { routeGuard } from './route-guard';

export const onRequest = sequence(
  runtimeEnv,
  perfDebug,
  securityHeaders,
  authentication,
  csrf,
  routeGuard
);
