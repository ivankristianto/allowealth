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
import { getDatabaseConfig } from '@/db/config';

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
  perf.setDialect(getDatabaseConfig().dialect);
  // Detect runtime environment
  // Note: nodejs_compat polyfills process.memoryUsage in Workers, so we
  // check navigator.userAgent which Workers sets to "Cloudflare-Workers".
  const isWorkers =
    typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';
  const isBun = typeof globalThis.Bun !== 'undefined';
  perf.setRuntime(isWorkers ? 'workers' : isBun ? 'bun' : 'node');
  context.locals.perf = perf;
  context.locals.serverTimings = {};

  const response = await next();

  const timings = context.locals.serverTimings!;
  timings['total'] = performance.now() - requestStart;
  timings['cpu'] = perf.getEstimatedCpuTime();
  timings['io-wait'] = perf.getIoWaitTime();

  if (Object.keys(timings).length > 0) {
    response.headers.set('Server-Timing', buildServerTimingHeader(timings));
  }

  return response;
};
