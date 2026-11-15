import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { runSqliteMigrations } from './migrate';

const MIGRATIONS_DIR = join(process.cwd(), 'drizzle/sqlite');
const PERMISSIONS_TAG = '0008_app_password_permissions';

interface Journal {
  entries: Array<{ tag: string }>;
}

function migrateToBeforePermissions(dbPath: string, scratch: string): void {
  const folder = join(scratch, 'migrations');
  cpSync(MIGRATIONS_DIR, folder, { recursive: true });
  const journalPath = join(folder, 'meta/_journal.json');
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as Journal;
  const cut = journal.entries.findIndex((entry) => entry.tag === PERMISSIONS_TAG);
  expect(cut).toBeGreaterThan(0);
  journal.entries = journal.entries.slice(0, cut);
  writeFileSync(journalPath, JSON.stringify(journal));

  const raw = new Database(dbPath);
  try {
    migrate(drizzle(raw), { migrationsFolder: folder });
  } finally {
    raw.close();
  }
}

describe(`migration ${PERMISSIONS_TAG}`, () => {
  let scratch: string;
  let dbPath: string;

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), 'allowealth-permissions-migration-'));
    dbPath = join(scratch, 'permissions.db');
  });

  afterEach(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  it('backfills each existing token with the wildcard for its scope', () => {
    migrateToBeforePermissions(dbPath, scratch);

    const before = new Database(dbPath);
    try {
      before.run(`INSERT INTO workspaces (id, name) VALUES ('ws-1', 'Household')`);
      before.run(
        `INSERT INTO users (id, workspace_id, email, name, role) VALUES ('u-1', 'ws-1', 'a@example.test', 'A', 'admin')`
      );
      before.run(
        `INSERT INTO mcp_app_passwords (id, user_id, workspace_id, name, token_hash, token_hint, scope, created_at) VALUES
          ('pat-read', 'u-1', 'ws-1', 'Reader', 'hash-read', 'aw_pat_aaaa', 'read', 1000),
          ('pat-write', 'u-1', 'ws-1', 'Writer', 'hash-write', 'aw_pat_bbbb', 'read-write', 2000)`
      );
    } finally {
      before.close();
    }

    runSqliteMigrations(dbPath);

    const after = new Database(dbPath);
    try {
      const rows = after
        .query('SELECT id, scope, permissions FROM mcp_app_passwords ORDER BY id')
        .all();
      expect(rows).toEqual([
        { id: 'pat-read', scope: 'read', permissions: '["*:read"]' },
        { id: 'pat-write', scope: 'read-write', permissions: '["*"]' },
      ]);

      after.run(
        `INSERT INTO mcp_app_passwords (id, user_id, workspace_id, name, token_hash, token_hint, scope, created_at) VALUES
          ('pat-bare', 'u-1', 'ws-1', 'Bare', 'hash-bare', 'aw_pat_cccc', 'read-write', 3000)`
      );
      // A row written without permissions must grant nothing once enforcement reads the column.
      expect(
        after.query(`SELECT permissions FROM mcp_app_passwords WHERE id = 'pat-bare'`).get()
      ).toEqual({ permissions: '[]' });
    } finally {
      after.close();
    }
  });
});
