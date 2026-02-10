/**
 * Cloudflare Turnstile Server-Side Verification
 *
 * Verifies Turnstile tokens by calling Cloudflare's siteverify API.
 * Graceful degradation: if TURNSTILE_SECRET_KEY is not set, verification is skipped.
 * Fail-closed: if configured but siteverify is unreachable, requests are rejected.
 */

import { logError } from '@/lib/utils';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileVerificationResult {
  success: boolean;
  error?: string;
}

interface SiteverifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

/**
 * Verify a Turnstile token server-side.
 *
 * @param token - The cf-turnstile-response token from the client
 * @param clientIP - The client's IP address for additional validation
 * @returns Verification result with success status and optional error message
 */
export async function verifyTurnstileToken(
  token: string,
  clientIP: string
): Promise<TurnstileVerificationResult> {
  const secretKey = import.meta.env.TURNSTILE_SECRET_KEY;

  // Graceful degradation: skip verification if not configured
  if (!secretKey) {
    return { success: true };
  }

  // Token is required when Turnstile is configured
  if (!token) {
    return {
      success: false,
      error: 'Bot protection token is missing. Please refresh the page and try again.',
    };
  }

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: clientIP,
      }),
    });

    if (!response.ok) {
      logError('Turnstile siteverify returned non-OK status', {
        status: response.status,
        statusText: response.statusText,
      });
      return {
        success: false,
        error: 'Bot protection verification service unavailable. Please try again later.',
      };
    }

    const data = (await response.json()) as SiteverifyResponse;

    if (data.success) {
      return { success: true };
    }

    const errorCodes = data['error-codes'] || [];
    logError('Turnstile verification failed', { errorCodes, clientIP });

    return {
      success: false,
      error: 'Bot protection verification failed. Please refresh the page and try again.',
    };
  } catch (err) {
    // Fail-closed: network errors reject the request
    logError('Turnstile siteverify network error', err);
    return {
      success: false,
      error: 'Bot protection verification service unavailable. Please try again later.',
    };
  }
}
