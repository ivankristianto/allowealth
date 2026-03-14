/**
 * Route Guard Middleware
 *
 * - Redirects unauthenticated users to /login when they access protected routes.
 *   Preserves the original URL as a query parameter so the login page can
 *   redirect back after successful authentication.
 * - Redirects authenticated users away from auth pages (/login, /signup, /register)
 *   to /dashboard, since they're already logged in.
 */

import type { MiddlewareHandler } from 'astro';

const PROTECTED_PREFIXES = [
  '/admin',
  '/dashboard',
  '/onboarding',
  '/transactions',
  '/recurring',
  '/budget',
  '/accounts',
  '/reports',
  '/forecast',
  '/calculators',
  '/settings',
  '/profile',
  '/security',
  '/oauth',
] as const;

/** Pages that authenticated users should be redirected away from */
const AUTH_PAGES = ['/login', '/signup', '/register'] as const;

export const routeGuard: MiddlewareHandler = async (context, next) => {
  const { pathname } = context.url;

  if (pathname === '/') {
    if (context.locals.user) {
      const target = context.locals.user.role === 'super_admin' ? '/admin' : '/dashboard';
      return context.redirect(target, 302);
    }

    return context.redirect('/login', 302);
  }

  // Redirect unauthenticated users away from protected routes
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isProtected && !context.locals.user) {
    const returnUrl = pathname + context.url.search;
    return context.redirect(`/login?redirect=${encodeURIComponent(returnUrl)}`, 302);
  }

  // Require super_admin role for /admin routes (pages and API)
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  if (isAdminRoute && context.locals.user && context.locals.user.role !== 'super_admin') {
    // API routes get JSON 403, page routes get redirected to dashboard
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Super admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return context.redirect('/dashboard', 302);
  }

  // Redirect super_admin users away from workspace-scoped routes to admin panel
  if (
    isProtected &&
    !isAdminRoute &&
    context.locals.user &&
    context.locals.user.role === 'super_admin'
  ) {
    return context.redirect('/admin', 302);
  }

  // Redirect authenticated users away from auth pages to dashboard
  const isAuthPage = AUTH_PAGES.some((page) => pathname === page);
  if (isAuthPage && context.locals.user) {
    const target = context.locals.user.role === 'super_admin' ? '/admin' : '/dashboard';
    return context.redirect(target, 302);
  }

  return next();
};
