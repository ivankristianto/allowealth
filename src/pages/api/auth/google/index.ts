/**
 * GET /api/auth/google
 *
 * Initiates Google OAuth flow.
 * Generates state + PKCE code verifier, stores in cookies, redirects to Google.
 */

import type { APIRoute } from 'astro';
import { generateState, generateCodeVerifier } from 'arctic';
import { createGoogleOAuthClient } from '@/lib/auth/oauth';
import { getEnv } from '@/lib/env';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, redirect }) => {
  try {
    const google = createGoogleOAuthClient();
    const state = generateState();
    const codeVerifier = generateCodeVerifier();

    const url = google.createAuthorizationURL(state, codeVerifier, ['openid', 'email', 'profile']);

    const isProduction = getEnv('NODE_ENV') === 'production';

    cookies.set('google_oauth_state', state, {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 10,
    });

    cookies.set('google_oauth_code_verifier', codeVerifier, {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 10,
    });

    return redirect(url.toString(), 302);
  } catch {
    return redirect('/login?error=oauth_error', 302);
  }
};
