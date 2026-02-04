/**
 * Runtime Environment Middleware
 *
 * Sets runtime environment for Cloudflare Workers where secrets
 * are only available via request context, not at module load time.
 *
 * When Hyperdrive is configured, uses its local connection string
 * instead of the remote DATABASE_URL (eliminates TCP subrequest overhead).
 *
 * Must run before any middleware that accesses environment variables.
 */

import type { MiddlewareHandler } from 'astro';
import { setRuntimeEnv } from '@/db/config';

export const runtimeEnv: MiddlewareHandler = async (context, next) => {
  const runtime = (context.locals as any).runtime;
  if (runtime?.env) {
    const env = { ...runtime.env };

    // Hyperdrive provides a local connection that doesn't count as subrequests.
    // Its connectionString points to a local proxy — Hyperdrive handles
    // TCP/TLS to the origin database at the Cloudflare edge.
    const hyperdrive = runtime.env.HYPERDRIVE;
    if (hyperdrive?.connectionString) {
      env.DATABASE_URL = hyperdrive.connectionString;
      env.HYPERDRIVE_ENABLED = 'true';
    }

    setRuntimeEnv(env);
  }
  return next();
};
