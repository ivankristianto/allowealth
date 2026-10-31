/**
 * Bun-based E2E Database Query Helper
 *
 * This script runs under Bun (not Node.js) and provides direct SQLite
 * access for Playwright E2E tests via subprocess invocation.
 *
 * Usage: bun run e2e/helpers/db-query.ts <db-path> <query-type> <param>
 *
 * Query types:
 *   create-token <email>         - Insert a verification token valid for 24 hours, print the raw token
 *   create-expired-token <email> - Insert an already-expired verification token, print the raw token
 *   is-verified <email>          - Check if user email is verified
 *   workspace-status <email>     - Get workspace status for user
 */
/* eslint-disable no-console */
import { Database } from 'bun:sqlite';

const [dbPath, queryType, param] = process.argv.slice(2);

if (!dbPath || !queryType || !param) {
  console.error('Usage: bun run e2e/helpers/db-query.ts <db-path> <query-type> <param>');
  process.exit(1);
}

const email = param.toLowerCase();

/** Store the SHA-256 hash like the app does and return the raw token. */
function insertVerificationToken(expiresInSeconds: number): string | null {
  const db = new Database(dbPath);
  try {
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as {
      id: string;
    } | null;
    if (!user) return null;

    const token = crypto.randomUUID();
    const tokenHash = new Bun.CryptoHasher('sha256').update(token).digest('hex');
    const nowSeconds = Math.floor(Date.now() / 1000);
    db.prepare(
      `INSERT INTO email_verification_tokens (id, token, user_id, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(crypto.randomUUID(), tokenHash, user.id, nowSeconds + expiresInSeconds, nowSeconds);
    return token;
  } finally {
    db.close();
  }
}

switch (queryType) {
  case 'create-token': {
    console.log(JSON.stringify({ token: insertVerificationToken(24 * 60 * 60) }));
    break;
  }

  case 'create-expired-token': {
    console.log(JSON.stringify({ token: insertVerificationToken(-60 * 60) }));
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
