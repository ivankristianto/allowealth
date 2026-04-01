/**
 * POST /api/auth/__reset-rate-limits
 *
 * E2E/dev-only endpoint to reset in-memory rate limit store.
 * Only available in development mode (astro dev). Disabled in production builds.
 */
import type { APIRoute } from 'astro';
import { getEnv } from '@/lib/env';
import { clearRateLimitStore } from '@/lib/rate-limit';

function normalizeHost(hostname: string): string {
  const trimmed = hostname.trim().toLowerCase();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function isAllowedDevResetHost(hostname: string): boolean {
  const normalizedHost = normalizeHost(hostname);
  return (
    normalizedHost === 'localhost' ||
    normalizedHost === '127.0.0.1' ||
    normalizedHost === '::1' ||
    normalizedHost.endsWith('.local')
  );
}

export const POST: APIRoute = async (context) => {
  const isDev = import.meta.env.DEV || getEnv('NODE_ENV') === 'development';
  if (!isDev) {
    return new Response(null, { status: 404 });
  }

  const hostname = new URL(context.request.url).hostname;
  if (!isAllowedDevResetHost(hostname)) {
    return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  clearRateLimitStore();
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
