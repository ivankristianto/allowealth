/**
 * POST /api/auth/__reset-rate-limits
 *
 * E2E-only endpoint to reset in-memory rate limit store.
 * Only available when E2E_USER_EMAIL environment variable is set
 * (indicating the server is running in E2E test mode).
 */
import type { APIRoute } from 'astro';
import { clearRateLimitStore } from '@/lib/rate-limit';

export const POST: APIRoute = async () => {
  if (!import.meta.env.E2E_USER_EMAIL) {
    return new Response(null, { status: 404 });
  }

  clearRateLimitStore();
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
