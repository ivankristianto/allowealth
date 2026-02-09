/**
 * Email Verification E2E Test Helpers
 *
 * Provides direct database access to the E2E test database
 * to retrieve verification tokens for testing the full flow.
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const E2E_DB_PATH = path.join(PROJECT_ROOT, 'db', '.e2e.db');

/**
 * Get the latest verification token for a user by email
 * @param email - User email address
 * @returns Verification token string or null
 */
export function getVerificationToken(email: string): string | null {
  const db = new Database(E2E_DB_PATH, { readonly: true });
  try {
    const row = db
      .prepare(
        `SELECT evt.token
         FROM email_verification_tokens evt
         JOIN users u ON evt.user_id = u.id
         WHERE u.email = ?
         ORDER BY evt.created_at DESC
         LIMIT 1`
      )
      .get(email.toLowerCase()) as { token: string } | undefined;

    return row?.token ?? null;
  } finally {
    db.close();
  }
}

/**
 * Mark a verification token as expired (for testing expired token flow)
 * @param email - User email address
 */
export function expireVerificationToken(email: string): void {
  const db = new Database(E2E_DB_PATH);
  try {
    const pastTime = Math.floor((Date.now() - 25 * 60 * 60 * 1000) / 1000); // 25 hours ago as unix timestamp
    db.prepare(
      `UPDATE email_verification_tokens
       SET expires_at = ?
       WHERE user_id IN (SELECT id FROM users WHERE email = ?)`
    ).run(pastTime, email.toLowerCase());
  } finally {
    db.close();
  }
}

/**
 * Check if a user is email-verified
 * @param email - User email address
 * @returns True if email is verified
 */
export function isUserVerified(email: string): boolean {
  const db = new Database(E2E_DB_PATH, { readonly: true });
  try {
    const row = db
      .prepare('SELECT email_verified_at FROM users WHERE email = ?')
      .get(email.toLowerCase()) as { email_verified_at: number | null } | undefined;

    return row?.email_verified_at != null;
  } finally {
    db.close();
  }
}

/**
 * Check workspace status for a user
 * @param email - User email address
 * @returns Workspace status or null
 */
export function getWorkspaceStatus(email: string): string | null {
  const db = new Database(E2E_DB_PATH, { readonly: true });
  try {
    const row = db
      .prepare(
        `SELECT w.status
         FROM workspaces w
         JOIN users u ON u.workspace_id = w.id
         WHERE u.email = ?`
      )
      .get(email.toLowerCase()) as { status: string } | undefined;

    return row?.status ?? null;
  } finally {
    db.close();
  }
}
