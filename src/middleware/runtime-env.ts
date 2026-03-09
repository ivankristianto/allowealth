/**
 * Runtime Environment Middleware
 *
 * Sets runtime environment for Cloudflare Workers where secrets
 * are only available via request context, not at module load time.
 *
 * When D1 is configured, stores the binding for the D1 driver.
 *
 * Must run before any middleware that accesses environment variables.
 */

import type { MiddlewareHandler } from 'astro';
import { setRuntimeEnv } from '@/db/config';
import { setD1Binding } from '@/db/drivers/d1';

export const runtimeEnv: MiddlewareHandler = async (context, next) => {
  const runtime = (context.locals as any).runtime;
  if (runtime?.env) {
    const env = { ...runtime.env };

    // Check for D1 database binding (Cloudflare-native SQLite database)
    const d1Binding = runtime.env.DB;
    if (d1Binding) {
      env.D1_ENABLED = 'true';
      setD1Binding(d1Binding);
    } else {
      setD1Binding(null);
    }

    setRuntimeEnv(env);
  }
  try {
    return await next();
  } finally {
    setD1Binding(null);
  }
};
