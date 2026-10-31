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
 * Insert a verification token valid for 24 hours and return the raw token.
 * Signup no longer issues tokens, so tests create one to exercise /api/auth/verify-email.
 */
export function createVerificationToken(email: string): string | null {
  return JSON.parse(runDbQuery('create-token', email)).token ?? null;
}

/**
 * Insert an already-expired verification token and return the raw token.
 */
export function createExpiredVerificationToken(email: string): string | null {
  return JSON.parse(runDbQuery('create-expired-token', email)).token ?? null;
}

export function isUserVerified(email: string): boolean {
  return JSON.parse(runDbQuery('is-verified', email)).verified;
}

export function getWorkspaceStatus(email: string): string | null {
  return JSON.parse(runDbQuery('workspace-status', email)).status ?? null;
}
