/**
 * Routes captured by the HTML snapshot tool.
 *
 * Static routes only. Dynamic `[id]` routes need seeded IDs and their
 * layouts are already exercised by the corresponding index route.
 *
 * Deliberately excluded because each needs state the snapshot run cannot
 * establish: `/installer` (only renders pre-setup), `/login/verify-mfa`
 * (needs a pending MFA challenge), `/oauth/authorize` and
 * `/oauth/display-token` (need an in-flight OAuth request).
 */
export const SNAPSHOT_ROUTES: string[] = [
  '/login',
  '/signup',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/dashboard',
  '/profile',
  '/security',
  '/settings',
  '/upgrade',
  '/calculators',
  '/onboarding',
  '/accounts',
  '/accounts/closed',
  '/accounts/history',
  '/accounts/categories',
  '/budget',
  '/budget/history',
  '/budget/categories',
  '/transactions',
  '/transactions/import',
  '/transactions/export',
  '/recurring',
  '/recurring/forecast',
  '/forecast',
  '/reports',
  '/reports/expenses',
  '/reports/income',
  '/reports/members',
  '/admin',
  '/admin/audit-logs',
  '/admin/diagnostics',
  '/admin/users',
  '/admin/workspaces',
];

/** Convert a route path into a safe snapshot filename. */
export function routeToSlug(route: string): string {
  const trimmed = route.replace(/^\//, '').replace(/\/$/, '');
  return (trimmed === '' ? 'index' : trimmed.replace(/\//g, '__')) + '.html';
}
