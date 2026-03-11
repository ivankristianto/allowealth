/**
 * Cloudflare Turnstile Server-Side Verification
 *
 * Verifies Turnstile tokens by calling Cloudflare's siteverify API.
 * Graceful degradation: if TURNSTILE_SECRET_KEY is not set, verification is skipped.
 * Fail-closed: if configured but siteverify is unreachable, requests are rejected.
 */

import { getEnv } from '@/lib/env';
import { logError } from '@/lib/logger';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const VERIFY_TIMEOUT_MS = 5000;

export interface TurnstileVerificationResult {
  success: boolean;
  error?: string;
  status?: number;
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
  const secretKey = getEnv('TURNSTILE_SECRET_KEY');
  const nodeEnv = getEnv('NODE_ENV');
  const isTest = nodeEnv === 'test';
  const isOptionalRuntime = import.meta.env.DEV || isTest;

  // Allow local dev and tests to run without external Turnstile configuration.
  if (!secretKey) {
    if (isOptionalRuntime) {
      return { success: true };
    }

    return {
      success: false,
      error: 'Bot protection is not configured for this environment.',
      status: 503,
    };
  }

  // Token is required when Turnstile is configured
  if (!token) {
    return {
      success: false,
      error: 'Bot protection token is missing. Please refresh the page and try again.',
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: clientIP,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      logError('Turnstile siteverify returned non-OK status', {
        status: response.status,
        statusText: response.statusText,
      });
      return {
        success: false,
        error: 'Bot protection verification service unavailable. Please try again later.',
        status: 503,
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
      status: 400,
    };
  } catch (err) {
    // Fail-closed: network errors reject the request
    logError('Turnstile siteverify network error', err);
    return {
      success: false,
      error: 'Bot protection verification service unavailable. Please try again later.',
      status: 503,
    };
  }
}
