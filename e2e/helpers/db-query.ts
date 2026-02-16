/**
 * Bun-based E2E Database Query Helper
 *
 * This script runs under Bun (not Node.js) and provides direct SQLite
 * access for Playwright E2E tests via subprocess invocation.
 *
 * Usage: bun run e2e/helpers/db-query.ts <db-path> <query-type> <param>
 *
 * Query types:
 *   get-token <email>        - Get latest verification token for user
 *   expire-token <email>     - Mark verification tokens as expired
 *   is-verified <email>      - Check if user email is verified
 *   workspace-status <email> - Get workspace status for user
 */
/* eslint-disable no-console */
import { Database } from 'bun:sqlite';

const [dbPath, queryType, param] = process.argv.slice(2);

if (!dbPath || !queryType || !param) {
  console.error('Usage: bun run e2e/helpers/db-query.ts <db-path> <query-type> <param>');
  process.exit(1);
}

const email = param.toLowerCase();

switch (queryType) {
  case 'get-token': {
    const db = new Database(dbPath, { readonly: true });
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
        .get(email) as { token: string } | null;
      console.log(JSON.stringify({ token: row?.token ?? null }));
    } finally {
      db.close();
    }
    break;
  }

  case 'expire-token': {
    const db = new Database(dbPath);
    try {
      const pastTime = Math.floor((Date.now() - 25 * 60 * 60 * 1000) / 1000);
      db.prepare(
        `UPDATE email_verification_tokens
         SET expires_at = ?
         WHERE user_id IN (SELECT id FROM users WHERE email = ?)`
      ).run(pastTime, email);
      console.log(JSON.stringify({ success: true }));
    } finally {
      db.close();
    }
    break;
  }

  case 'is-verified': {
    const db = new Database(dbPath, { readonly: true });
    try {
      const row = db.prepare('SELECT email_verified_at FROM users WHERE email = ?').get(email) as {
        email_verified_at: number | null;
      } | null;
      console.log(JSON.stringify({ verified: row?.email_verified_at != null }));
    } finally {
      db.close();
    }
    break;
  }

  case 'workspace-status': {
    const db = new Database(dbPath, { readonly: true });
    try {
      const row = db
        .prepare(
          `SELECT w.status
           FROM workspaces w
           JOIN users u ON u.workspace_id = w.id
           WHERE u.email = ?`
        )
        .get(email) as { status: string } | null;
      console.log(JSON.stringify({ status: row?.status ?? null }));
    } finally {
      db.close();
    }
    break;
  }

  default:
    console.error(`Unknown query type: ${queryType}`);
    process.exit(1);
}
