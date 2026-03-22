import { getEnv } from '@/lib/env';

/**
 * Returns true when the app is running in demo mode.
 *
 * IMPORTANT: Call only at SSR request time (inside Astro frontmatter or API
 * handlers), never at module load time. On Cloudflare Workers, runtime env is
 * not available at module load time in all contexts.
 */
export function isDemoMode(): boolean {
  return getEnv('DEMO_MODE') === 'true';
}
