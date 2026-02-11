/**
 * POST /api/auth/__reset-rate-limits
 *
 * E2E/dev-only endpoint to reset in-memory rate limit store.
 * Only available in development mode (astro dev). Disabled in production builds.
 */
import type { APIRoute } from 'astro';
import { clearRateLimitStore } from '@/lib/rate-limit';

export const POST: APIRoute = async () => {
  if (!import.meta.env.DEV) {
    return new Response(null, { status: 404 });
  }

  clearRateLimitStore();
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
