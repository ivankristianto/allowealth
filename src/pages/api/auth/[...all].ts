import type { APIContext, APIRoute } from 'astro';
import { auth } from '@/lib/auth/server';
import { withClientIpHeader } from '@/lib/auth/client-ip';

/**
 * Astro throws when the adapter cannot report a client address. Better Auth
 * then falls back to one shared rate-limit bucket and logs a warning, which
 * fails safe instead of turning every auth request into a 500.
 */
function readClientAddress(context: APIContext): string | undefined {
  try {
    return context.clientAddress;
  } catch {
    return undefined;
  }
}

const handler: APIRoute = async (context) => {
  return auth.handler(withClientIpHeader(context.request, readClientAddress(context)));
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
