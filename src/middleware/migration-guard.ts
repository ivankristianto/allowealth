/**
 * Migration Guard Middleware
 *
 * Checks whether database migrations are pending on every request.
 * When pending:
 *   - super_admin -> redirect to /upgrade to trigger the migration
 *   - everyone else -> 503 inline maintenance page (URL preserved)
 *
 * Placed after `csrf` and before `routeGuard` in the middleware chain.
 *
 * WORKERS-SAFE: Imports MigrationService which uses the shared db proxy from
 * @/db — auto-selects D1 driver in Workers, bun:sqlite in local dev.
 */

import type { MiddlewareHandler } from 'astro';
import { MigrationService } from '@/services/migration.service';

/**
 * Paths that always bypass the migration check.
 * The upgrade page and its API endpoints must pass through so the admin
 * can reach the UI and trigger/poll the migration.
 */
const PASSLIST_EXACT = [
  '/upgrade',
  '/api/admin/upgrade/run',
  '/api/admin/upgrade/status',
  '/favicon.ico',
];

/** Prefix-matched paths (e.g. static asset directories). */
const PASSLIST_PREFIX = ['/_astro/'];

function isPasslisted(pathname: string): boolean {
  return (
    PASSLIST_EXACT.includes(pathname) ||
    PASSLIST_PREFIX.some((prefix) => pathname.startsWith(prefix))
  );
}

function maintenancePage(): Response {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Maintenance — allowealth</title>
    <style>
      :root { color-scheme: light dark; }
      body {
        margin: 0;
        min-height: 100dvh;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Inter, system-ui, sans-serif;
        background: var(--color-base-100, #f8fafc);
        color: var(--color-base-content, #1e293b);
      }
      .card {
        text-align: center;
        max-width: 400px;
        padding: 2.5rem 2rem;
      }
      h1 { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem; }
      p { font-size: 0.9rem; color: #64748b; margin: 0; }
      .logo { font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; letter-spacing: -0.02em; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="logo">allowealth</div>
      <h1>Undergoing scheduled maintenance</h1>
      <p>The application is being upgraded. Please check back shortly.</p>
    </div>
  </body>
</html>`;

  return new Response(html, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Retry-After': '60',
    },
  });
}

export const migrationGuard: MiddlewareHandler = async (context, next) => {
  const { pathname } = context.url;

  // Skip the check for upgrade UI, its API endpoints, and static assets
  if (isPasslisted(pathname)) {
    return next();
  }

  const pending = await MigrationService.isMigrationPending();

  if (!pending) {
    return next();
  }

  // Super admin gets redirected to the upgrade page to take action
  if (context.locals.user?.role === 'super_admin') {
    return context.redirect('/upgrade', 302);
  }

  // All other users (unauthenticated, admin, member) see the maintenance page
  return maintenancePage();
};
