/**
 * Installer Middleware
 *
 * Detects whether the app needs first-run setup:
 * 1. If migrations not applied — runs them automatically, redirects to /installer
 * 2. If no users exist — redirects to /installer
 * 3. If users exist and path is /installer — redirects to /login
 * 4. Otherwise — passes through to next middleware
 * 5. In D1 runtime — no-op (installer is Bun/SQLite-only)
 *
 * Must run after database middleware and before authentication.
 */

import type { MiddlewareHandler } from 'astro';
import { isMigrationApplied, hasUsers } from '@/lib/installer/detection';
import { getDatabaseConfig, getDb, resetDb } from '@/db';

/** Escape HTML special characters to prevent XSS in error pages */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function createMigrationFailedResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : String(error);
  return new Response(
    `<html><body><h1>Migration Failed</h1><pre>${escapeHtml(message)}</pre><p>Fix the issue and reload.</p></body></html>`,
    { status: 500, headers: { 'Content-Type': 'text/html' } }
  );
}

/** Paths that skip detection entirely */
const STATIC_PREFIXES = ['/_astro/', '/favicon', '/scripts/'] as const;

function isStaticAssetPath(pathname: string): boolean {
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  return !pathname.startsWith('/api/') && /\.[a-z0-9]+$/i.test(pathname);
}

/** Paths allowed through when no users exist */
const INSTALLER_PATHS = ['/installer', '/api/installer/'] as const;

/** In-memory flag — once users are confirmed, skip detection for this process */
let setupComplete = false;

/** Process-level lock to prevent concurrent migrations */
let migrationInFlight: Promise<void> | null = null;

export const installerGuard: MiddlewareHandler = async (context, next) => {
  const { pathname } = context.url;

  // Skip static assets
  if (isStaticAssetPath(pathname)) {
    return next();
  }

  // Installer flow is Bun/SQLite-only; skip guard entirely for D1 runtime.
  if (getDatabaseConfig().isD1) {
    return next();
  }

  // Fast path: if we already confirmed setup is complete this process, skip checks
  if (setupComplete) {
    // Still redirect /installer to /login
    if (pathname === '/installer' || pathname.startsWith('/api/installer/')) {
      return context.redirect('/login', 302);
    }
    return next();
  }

  const db = getDb();

  // Step 1: Check migrations (with process-level lock to prevent concurrent runs)
  if (!isMigrationApplied(db)) {
    // If migration is already in flight, wait for it
    if (migrationInFlight) {
      try {
        await migrationInFlight;
      } catch (error) {
        return createMigrationFailedResponse(error);
      }
    } else {
      // Start migration and store the promise
      migrationInFlight = (async () => {
        try {
          const { runSqliteMigrations } = await import('@/db/migrate');
          runSqliteMigrations();
          resetDb();
        } finally {
          migrationInFlight = null;
        }
      })();

      try {
        await migrationInFlight;
      } catch (error) {
        return createMigrationFailedResponse(error);
      }
    }
  }

  // Step 2: Check users (re-acquire db after potential migration + reset)
  const currentDb = getDb();
  if (!hasUsers(currentDb)) {
    // Allow installer routes through
    if (INSTALLER_PATHS.some((p) => pathname === p || pathname.startsWith(p))) {
      return next();
    }
    return context.redirect('/installer', 302);
  }

  // Setup is complete — set flag and redirect away from installer
  setupComplete = true;

  if (pathname === '/installer' || pathname.startsWith('/api/installer/')) {
    return context.redirect('/login', 302);
  }

  return next();
};

/**
 * Reset the in-memory setup flag. Used for testing.
 */
export function resetInstallerFlag(): void {
  setupComplete = false;
}
