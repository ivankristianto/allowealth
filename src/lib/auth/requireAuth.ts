/**
 * Protected Route Helper
 *
 * Utility function to protect routes by checking if user is authenticated.
 * Redirects to login page with return URL if not authenticated.
 *
 * Usage in Astro pages:
 * ```astro
 * ---
 * import { requireAuth } from '@/lib/auth/requireAuth';
 *
 * const redirect = requireAuth(Astro);
 * if (redirect) return redirect;
 * ---
 * ```
 */

/**
 * Authentication check result
 * - If user is authenticated: returns null (allow access)
 * - If user is not authenticated: returns a redirect response
 */
export type AuthCheckResult = Response | null;

/**
 * Require authentication for a route
 *
 * Checks if the user is authenticated via Astro.locals.user.
 * If not authenticated, redirects to the login page with the original URL
 * preserved as a query parameter for post-login redirect.
 *
 * @param astro - Astro global object
 * @param redirectTo - Path to redirect to when not authenticated (default: '/login')
 * @returns Response if not authenticated, null if authenticated
 *
 * @example
 * ```astro
 * ---
 * import { requireAuth } from '@/lib/auth/requireAuth';
 *
 * // Check authentication at the top of your protected page
 * const redirectResponse = requireAuth(Astro);
 * if (redirectResponse) {
 *   return redirectResponse;
 * }
 *
 * // User is authenticated, proceed with page logic
 * const user = Astro.locals.user;
 * ---
 * ```
 */
export function requireAuth(astro: any, redirectTo: string = '/login'): AuthCheckResult {
  // Check if user is authenticated
  if (!astro.locals?.user) {
    // User is not authenticated - redirect to login
    const returnUrl = astro.url.pathname + astro.url.search;
    const loginUrl = `${redirectTo}?redirect=${encodeURIComponent(returnUrl)}`;

    return astro.redirect(loginUrl, 302); // 302 Found - temporary redirect
  }

  // User is authenticated - allow access
  return null;
}

/**
 * Optional authentication check
 *
 * Similar to requireAuth but returns false instead of redirecting.
 * Useful for pages that have different content for authenticated vs non-authenticated users.
 *
 * @param astro - Astro global object
 * @returns true if authenticated, false otherwise
 *
 * @example
 * ```astro
 * ---
 * import { isAuthenticated } from '@/lib/auth/requireAuth';
 *
 * const isLoggedIn = isAuthenticated(Astro);
 * ---
 *
 * {isLoggedIn ? (
 *   <p>Welcome back, {Astro.locals.user?.name}</p>
 * ) : (
 *   <a href="/login">Sign in</a>
 * )}
 * ```
 */
export function isAuthenticated(astro: any): boolean {
  return astro.locals?.user !== null;
}

/**
 * Get current user from context
 *
 * Helper function to get the current authenticated user with type safety.
 *
 * @param astro - Astro global object
 * @returns User object if authenticated, null otherwise
 */
export function getCurrentUser(astro: any): any {
  return astro.locals?.user;
}

/**
 * Require admin role for a route
 *
 * Checks if the user is authenticated and has admin role.
 * If not authenticated, redirects to the login page.
 * If authenticated but not admin, returns a 403 Forbidden response.
 *
 * @param astro - Astro global object
 * @returns Response if not authorized, null if authorized
 *
 * @example
 * ```astro
 * ---
 * import { requireAdmin } from '@/lib/auth/requireAuth';
 *
 * // Check admin authorization at the top of your admin-only page
 * const authResponse = requireAdmin(Astro);
 * if (authResponse) {
 *   return authResponse;
 * }
 *
 * // User is authenticated and is admin, proceed with page logic
 * const user = Astro.locals.user;
 * ---
 * ```
 */
export function requireAdmin(astro: any): AuthCheckResult {
  // First check if user is authenticated
  const authResult = requireAuth(astro);
  if (authResult) return authResult;

  // Check if user has admin role
  if (astro.locals?.user?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // User is authenticated and is admin - allow access
  return null;
}
