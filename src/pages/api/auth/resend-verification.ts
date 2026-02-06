/**
 * POST /api/auth/resend-verification
 *
 * Resend Verification Email Endpoint
 *
 * Request body: { email: string }
 *
 * Rate limits: 3 requests per hour per IP
 * Generic responses to prevent user enumeration.
 */

import type { APIRoute } from 'astro';
import { db } from '@/db';
import { getActiveSchema } from '@/db';
import { EmailVerificationService } from '@/services/email-verification.service';
import { emailService } from '@/services';
import {
  checkRateLimit,
  checkRateLimitByKey,
  createRateLimitResponse,
  applyRateLimitHeaders,
  RATE_LIMIT_PRESETS,
} from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';
import { eq } from 'drizzle-orm';
import { STANDARD_RESPONSE_HEADERS } from '@/types/api';

const log = createLogger('api:resend-verification');
const schema = getActiveSchema();

export const prerender = false;

const GENERIC_MESSAGE =
  'If your email is registered and unverified, a verification link has been sent.';

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Rate limiting: 3 per hour per IP
  const rateLimitResult = checkRateLimit(
    request,
    RATE_LIMIT_PRESETS.resendVerification,
    clientAddress
  );
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult, RATE_LIMIT_PRESETS.resendVerification.message);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: STANDARD_RESPONSE_HEADERS,
    });
  }

  const { email } = body;

  if (!email || typeof email !== 'string') {
    return new Response(JSON.stringify({ error: 'Email is required' }), {
      status: 400,
      headers: STANDARD_RESPONSE_HEADERS,
    });
  }

  // Per-email rate limit: 3 per hour per email address
  const perEmailResult = checkRateLimitByKey(
    `resend-verification:${email.toLowerCase()}`,
    RATE_LIMIT_PRESETS.resendVerificationPerEmail
  );
  if (!perEmailResult.allowed) {
    return createRateLimitResponse(
      perEmailResult,
      RATE_LIMIT_PRESETS.resendVerificationPerEmail.message
    );
  }

  // Look up user (don't reveal if user exists)
  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email.toLowerCase()),
  });

  if (!user) {
    // Don't reveal user doesn't exist
    log.info('Resend attempt for non-existent user', { email });
    const response = new Response(JSON.stringify({ message: GENERIC_MESSAGE }), {
      status: 200,
      headers: STANDARD_RESPONSE_HEADERS,
    });
    return applyRateLimitHeaders(response, rateLimitResult);
  }

  // Check if already verified
  if (user.email_verified_at) {
    log.info('Resend attempt for already verified user', { email });
    const response = new Response(JSON.stringify({ message: GENERIC_MESSAGE }), {
      status: 200,
      headers: STANDARD_RESPONSE_HEADERS,
    });
    return applyRateLimitHeaders(response, rateLimitResult);
  }

  // Send new verification email
  try {
    const emailVerificationService = new EmailVerificationService(db, emailService);
    await emailVerificationService.sendVerificationEmail(user.id);
    log.info('Verification email resent', { email });
  } catch (error) {
    log.error('Failed to resend verification email', { email, error });
  }

  const response = new Response(JSON.stringify({ message: GENERIC_MESSAGE }), {
    status: 200,
    headers: STANDARD_RESPONSE_HEADERS,
  });
  return applyRateLimitHeaders(response, rateLimitResult);
};
