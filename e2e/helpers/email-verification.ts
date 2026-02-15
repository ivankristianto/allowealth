/**
 * Email Verification E2E Test Helpers
 *
 * Provides database access to the E2E test database via a Bun subprocess.
 * Playwright runs in Node.js, so we shell out to Bun for SQLite access.
 */

import { execFileSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const E2E_DB_PATH = path.join(PROJECT_ROOT, 'db', '.e2e.db');
const DB_QUERY_SCRIPT = path.join(__dirname, 'db-query.ts');

/**
 * Run a database query via Bun subprocess
 */
function runDbQuery(queryType: string, email: string): string {
  return execFileSync('bun', ['run', DB_QUERY_SCRIPT, E2E_DB_PATH, queryType, email], {
    encoding: 'utf-8',
    cwd: PROJECT_ROOT,
  }).trim();
}

/**
 * Get the latest verification token for a user by email
 * @param email - User email address
 * @returns Verification token string or null
 */
export function getVerificationToken(email: string): string | null {
  const result = JSON.parse(runDbQuery('get-token', email));
  return result.token ?? null;
}

/**
 * Mark a verification token as expired (for testing expired token flow)
 * @param email - User email address
 */
export function expireVerificationToken(email: string): void {
  runDbQuery('expire-token', email);
}

/**
 * Check if a user is email-verified
 * @param email - User email address
 * @returns True if email is verified
 */
export function isUserVerified(email: string): boolean {
  const result = JSON.parse(runDbQuery('is-verified', email));
  return result.verified;
}

/**
 * Check workspace status for a user
 * @param email - User email address
 * @returns Workspace status or null
 */
export function getWorkspaceStatus(email: string): string | null {
  const result = JSON.parse(runDbQuery('workspace-status', email));
  return result.status ?? null;
}
