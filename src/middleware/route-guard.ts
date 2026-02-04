/**
 * Route Guard Middleware
 *
 * Redirects unauthenticated users to /login when they access protected routes.
 * Preserves the original URL as a query parameter so the login page can
 * redirect back after successful authentication.
 */

import type { MiddlewareHandler } from 'astro';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/transactions',
  '/budget',
  '/assets',
  '/reports',
  '/forecast',
  '/calculators',
  '/settings',
  '/profile',
  '/security',
] as const;

export const routeGuard: MiddlewareHandler = async (context, next) => {
  const isProtected = PROTECTED_PREFIXES.some((prefix) => context.url.pathname.startsWith(prefix));

  if (isProtected && !context.locals.user) {
    const returnUrl = context.url.pathname + context.url.search;
    return context.redirect(`/login?redirect=${encodeURIComponent(returnUrl)}`, 302);
  }

  return next();
};
