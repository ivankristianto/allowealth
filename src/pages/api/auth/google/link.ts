/**
 * POST /api/auth/google/link
 *
 * Confirms account linking after user consent.
 * Reads pending link data from cookie, creates the OAuth link, and starts a session.
 */

import type { APIRoute } from 'astro';
import { auth } from '@/lib/auth/lucia';
import { confirmAccountLink } from '@/services/auth.service';
import { createLogger } from '@/lib/logger';

const log = createLogger('oauth:google:link');

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  try {
    const pendingLinkCookie = cookies.get('pending_oauth_link')?.value;
    if (!pendingLinkCookie) {
      return redirect('/login?error=link_expired', 302);
    }

    const pendingLink = JSON.parse(pendingLinkCookie) as {
      userId: string;
      provider: string;
      providerAccountId: string;
      email: string;
      name: string;
      avatarUrl: string | null;
      expiresAt: number;
    };

    cookies.delete('pending_oauth_link', { path: '/' });

    if (Date.now() > pendingLink.expiresAt) {
      return redirect('/login?error=link_expired', 302);
    }

    const { session } = await confirmAccountLink(pendingLink.userId, {
      provider: pendingLink.provider,
      providerAccountId: pendingLink.providerAccountId,
      email: pendingLink.email,
      name: pendingLink.name,
      avatarUrl: pendingLink.avatarUrl || undefined,
    });

    const sessionCookie = auth.createSessionCookie(session.id);
    cookies.set(sessionCookie.name, sessionCookie.value, {
      path: sessionCookie.attributes.path || '/',
      httpOnly: true,
      secure: sessionCookie.attributes.secure,
      sameSite: sessionCookie.attributes.sameSite as 'lax' | 'strict' | 'none',
      maxAge: sessionCookie.attributes.maxAge,
    });

    return redirect('/dashboard', 302);
  } catch (error) {
    log.error('Account linking error', error);
    cookies.delete('pending_oauth_link', { path: '/' });
    return redirect('/login?error=link_failed', 302);
  }
};
