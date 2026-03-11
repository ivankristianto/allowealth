import type { APIRoute } from 'astro';
import { auth } from '@/lib/auth/server';
import { verifyTurnstileToken } from '@/lib/turnstile';

const TURNSTILE_PROTECTED_PATHS = new Set(['/api/auth/sign-in/email', '/api/auth/sign-up/email']);

function getClientIp(headers: Headers): string {
  const cloudflareIp = headers.get('cf-connecting-ip');
  if (cloudflareIp) {
    return cloudflareIp.trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || '127.0.0.1';
  }

  return '127.0.0.1';
}

function createTurnstileErrorResponse(message: string, status = 400): Response {
  return Response.json(
    {
      message,
      error: {
        code: 'TURNSTILE_VERIFICATION_FAILED',
        message,
      },
    },
    { status }
  );
}

async function verifyProtectedAuthRequest(request: Request): Promise<Response | null> {
  if (request.method !== 'POST') {
    return null;
  }

  const pathname = new URL(request.url).pathname;
  if (!TURNSTILE_PROTECTED_PATHS.has(pathname)) {
    return null;
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await request.clone().json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  const turnstileToken = typeof payload.turnstileToken === 'string' ? payload.turnstileToken : '';
  const verification = await verifyTurnstileToken(turnstileToken, getClientIp(request.headers));

  if (verification.success) {
    return null;
  }

  return createTurnstileErrorResponse(
    verification.error || 'Bot protection verification failed. Please try again.',
    verification.status ?? 400
  );
}

const handler: APIRoute = async ({ request }) => {
  const turnstileError = await verifyProtectedAuthRequest(request);
  if (turnstileError) {
    return turnstileError;
  }

  return auth.handler(request);
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
