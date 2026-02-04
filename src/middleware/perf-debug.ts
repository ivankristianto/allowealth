/**
 * Performance Debug Middleware
 *
 * Creates a PerfCollector for request-level performance tracking and exposes
 * timing metrics via the Server-Timing header (visible in browser DevTools).
 * Enable with PERF_DEBUG=true environment variable.
 *
 * Other middleware can write to `locals.serverTimings` to include their
 * metrics in the Server-Timing header.
 */

import type { MiddlewareHandler } from 'astro';
import { PerfCollector } from '@/lib/perf';
import { getEnv } from '@/lib/env';

/**
 * Build Server-Timing header from timing entries
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing
 */
function buildServerTimingHeader(timings: Record<string, number>): string {
  return Object.entries(timings)
    .map(([name, value]) => {
      if (name === 'auth.source') {
        const desc = value === 1 ? 'cache' : 'db';
        return `${name.replace(/\./g, '-')};desc="${desc}"`;
      }
      return `${name.replace(/\./g, '-')};dur=${value.toFixed(2)}`;
    })
    .join(', ');
}

export const perfDebug: MiddlewareHandler = async (context, next) => {
  const enabled = getEnv('PERF_DEBUG') === 'true';

  if (!enabled) {
    return next();
  }

  const requestStart = performance.now();
  const perf = new PerfCollector();
  perf.setRoute(context.url.pathname);
  context.locals.perf = perf;
  context.locals.serverTimings = {};

  const response = await next();

  const timings = context.locals.serverTimings!;
  timings['total'] = performance.now() - requestStart;

  if (Object.keys(timings).length > 0) {
    response.headers.set('Server-Timing', buildServerTimingHeader(timings));
  }

  return response;
};
