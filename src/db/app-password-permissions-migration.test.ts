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
const BACKFILL_TAG = '0009_app_password_permissions_backfill';
const DROP_SCOPE_TAG = '0010_drop_app_password_scope';

interface Journal {
  entries: Array<{ tag: string }>;
}

/** Applies every migration before `tag`, in a copy of the folder, so the next ones can be tested. */
function migrateToBefore(tag: string, dbPath: string, scratch: string): void {
  const folder = join(scratch, `migrations-before-${tag}`);
  cpSync(MIGRATIONS_DIR, folder, { recursive: true });
  const journalPath = join(folder, 'meta/_journal.json');
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as Journal;
  const cut = journal.entries.findIndex((entry) => entry.tag === tag);
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

function seedOwner(database: Database): void {
  database.run(`INSERT INTO workspaces (id, name) VALUES ('ws-1', 'Household')`);
  database.run(
    `INSERT INTO users (id, workspace_id, email, name, role) VALUES ('u-1', 'ws-1', 'a@example.test', 'A', 'admin')`
  );
}

describe('app password permission migrations', () => {
  let scratch: string;
  let dbPath: string;

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), 'allowealth-permissions-migration-'));
    dbPath = join(scratch, 'permissions.db');
  });

  afterEach(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  it(`${PERMISSIONS_TAG} and ${BACKFILL_TAG} backfill each token with its scope's wildcard`, () => {
    migrateToBefore(PERMISSIONS_TAG, dbPath, scratch);

    const before = new Database(dbPath);
    try {
      seedOwner(before);
      before.run(
        `INSERT INTO mcp_app_passwords (id, user_id, workspace_id, name, token_hash, token_hint, scope, created_at) VALUES
          ('pat-read', 'u-1', 'ws-1', 'Reader', 'hash-read', 'aw_pat_aaaa', 'read', 1000),
          ('pat-write', 'u-1', 'ws-1', 'Writer', 'hash-write', 'aw_pat_bbbb', 'read-write', 2000)`
      );
    } finally {
      before.close();
    }

    migrateToBefore(DROP_SCOPE_TAG, dbPath, scratch);

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

  it(`${DROP_SCOPE_TAG} drops scope and keeps every token's permissions`, () => {
    migrateToBefore(DROP_SCOPE_TAG, dbPath, scratch);

    const before = new Database(dbPath);
    try {
      seedOwner(before);
      before.run(
        `INSERT INTO mcp_app_passwords (id, user_id, workspace_id, name, token_hash, token_hint, scope, permissions, created_at) VALUES
          ('pat-read', 'u-1', 'ws-1', 'Reader', 'hash-read', 'aw_pat_aaaa', 'read', '["*:read"]', 1000),
          ('pat-custom', 'u-1', 'ws-1', 'Custom', 'hash-custom', 'aw_pat_bbbb', 'read', '["transactions:create","budgets:read"]', 2000)`
      );
    } finally {
      before.close();
    }

    runSqliteMigrations(dbPath);

    const after = new Database(dbPath);
    try {
      const columns = after
        .query(`SELECT name FROM pragma_table_info('mcp_app_passwords')`)
        .all()
        .map((column) => (column as { name: string }).name);
      expect(columns).not.toContain('scope');
      expect(columns).toContain('permissions');

      expect(
        after
          .query('SELECT id, name, token_hash, permissions FROM mcp_app_passwords ORDER BY id')
          .all()
      ).toEqual([
        {
          id: 'pat-custom',
          name: 'Custom',
          token_hash: 'hash-custom',
          permissions: '["transactions:create","budgets:read"]',
        },
        { id: 'pat-read', name: 'Reader', token_hash: 'hash-read', permissions: '["*:read"]' },
      ]);
      expect(
        after
          .query(
            `SELECT name FROM sqlite_master WHERE tbl_name = 'mcp_app_passwords' AND type = 'index' ORDER BY name`
          )
          .all()
      ).toContainEqual({ name: 'mcp_app_passwords_user_id_idx' });
    } finally {
      after.close();
    }
  });
});
