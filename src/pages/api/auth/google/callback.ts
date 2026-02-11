/**
 * GET /api/auth/google/callback
 *
 * Handles Google OAuth callback.
 * Validates state, exchanges code for tokens, fetches profile, creates/links account.
 */

import type { APIRoute } from 'astro';
import { createGoogleOAuthClient } from '@/lib/auth/oauth';
import { auth } from '@/lib/auth/lucia';
import { loginOrRegisterWithOAuth } from '@/services/auth.service';
import { createLogger } from '@/lib/logger';
import { getEnv } from '@/lib/env';
import { checkRateLimit, RATE_LIMIT_PRESETS } from '@/lib/rate-limit';

const log = createLogger('oauth:google:callback');

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies, redirect, clientAddress, request }) => {
  try {
    const rateLimitResult = checkRateLimit(request, RATE_LIMIT_PRESETS.login, clientAddress);
    if (!rateLimitResult.allowed) {
      return redirect('/login?error=rate_limited', 302);
    }

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const storedState = cookies.get('google_oauth_state')?.value;
    const storedCodeVerifier = cookies.get('google_oauth_code_verifier')?.value;

    // Clean up OAuth cookies regardless of outcome
    cookies.delete('google_oauth_state', { path: '/' });
    cookies.delete('google_oauth_code_verifier', { path: '/' });

    if (!code || !state || !storedState || !storedCodeVerifier || state !== storedState) {
      log.warn('OAuth state validation failed');
      return redirect('/login?error=oauth_error', 302);
    }

    const google = createGoogleOAuthClient();
    const tokens = await google.validateAuthorizationCode(code, storedCodeVerifier);
    const accessToken = tokens.accessToken();

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileResponse.ok) {
      log.error('Failed to fetch Google profile', { status: profileResponse.status });
      return redirect('/login?error=oauth_error', 302);
    }

    const googleUser = (await profileResponse.json()) as {
      sub: string;
      email: string;
      name: string;
      picture?: string;
      email_verified?: boolean;
    };

    if (!googleUser.email) {
      log.error('Google profile missing email');
      return redirect('/login?error=oauth_error', 302);
    }

    const result = await loginOrRegisterWithOAuth({
      provider: 'google',
      providerAccountId: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name || googleUser.email.split('@')[0],
      avatarUrl: googleUser.picture,
    });

    if (result.needsLinking === false) {
      const sessionCookie = auth.createSessionCookie(result.session.id);
      cookies.set(sessionCookie.name, sessionCookie.value, {
        path: sessionCookie.attributes.path || '/',
        httpOnly: true,
        secure: sessionCookie.attributes.secure,
        sameSite: sessionCookie.attributes.sameSite as 'lax' | 'strict' | 'none',
        maxAge: sessionCookie.attributes.maxAge,
      });

      return redirect('/dashboard', 302);
    }

    const isProduction = getEnv('NODE_ENV') === 'production';
    const pendingLink = JSON.stringify({
      userId: result.pendingUserId,
      provider: 'google',
      providerAccountId: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name || googleUser.email.split('@')[0],
      avatarUrl: googleUser.picture || null,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    cookies.set('pending_oauth_link', pendingLink, {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 10,
    });

    return redirect('/auth/link-account', 302);
  } catch (error) {
    log.error('OAuth callback error', error);
    return redirect('/login?error=oauth_error', 302);
  }
};
