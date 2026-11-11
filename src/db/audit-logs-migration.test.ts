import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { runSqliteMigrations } from './migrate';

const MIGRATIONS_DIR = join(process.cwd(), 'drizzle/sqlite');
const REBUILD_TAG = '0007_audit_logs_keep_on_delete';

interface Journal {
  entries: Array<{ tag: string }>;
}

/** Applies every migration before the audit_logs rebuild. */
function migrateToBeforeRebuild(dbPath: string, scratch: string): void {
  const folder = join(scratch, 'migrations');
  cpSync(MIGRATIONS_DIR, folder, { recursive: true });
  const journalPath = join(folder, 'meta/_journal.json');
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as Journal;
  const cut = journal.entries.findIndex((entry) => entry.tag === REBUILD_TAG);
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

function auditRows(raw: Database) {
  return raw
    .query('SELECT id, workspace_id, user_id, action, created_at FROM audit_logs ORDER BY id')
    .all() as Array<Record<string, string | number | null>>;
}

describe(`migration ${REBUILD_TAG}`, () => {
  let scratch: string;
  let dbPath: string;

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), 'allowealth-audit-migration-'));
    dbPath = join(scratch, 'audit.db');
  });

  afterEach(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  it('copies every audit row, nulls dangling links, and stops cascading deletes', () => {
    migrateToBeforeRebuild(dbPath, scratch);

    const raw = new Database(dbPath);
    try {
      raw.run(`INSERT INTO workspaces (id, name) VALUES ('ws-1', 'Household')`);
      raw.run(
        `INSERT INTO users (id, workspace_id, email, name, role) VALUES ('u-1', 'ws-1', 'a@example.test', 'A', 'admin')`
      );
      raw.run(
        `INSERT INTO audit_logs (id, workspace_id, user_id, action, entity_type, created_at) VALUES
          ('a-1', 'ws-1', 'u-1', 'login', 'session', 1000),
          ('a-2', 'ws-1', 'u-1', 'create', 'transaction', 2000)`
      );
      // Seeds run with foreign keys off, so orphans can exist in real databases.
      raw.run('PRAGMA foreign_keys = OFF');
      raw.run(
        `INSERT INTO audit_logs (id, workspace_id, user_id, action, entity_type, created_at) VALUES
          ('a-3', 'ws-gone', 'u-gone', 'logout', 'session', 3000)`
      );
    } finally {
      raw.close();
    }

    const before = (() => {
      const db = new Database(dbPath);
      try {
        return auditRows(db);
      } finally {
        db.close();
      }
    })();

    runSqliteMigrations(dbPath);

    const after = new Database(dbPath);
    try {
      after.run('PRAGMA foreign_keys = ON');
      const rows = auditRows(after);
      expect(rows).toHaveLength(before.length);
      expect(rows.slice(0, 2)).toEqual(before.slice(0, 2));
      expect(rows[2]).toEqual({ ...before[2], workspace_id: null, user_id: null });

      const indexes = after
        .query(
          `SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'audit_logs' AND sql IS NOT NULL`
        )
        .all() as Array<{ name: string }>;
      expect(indexes.map((index) => index.name).sort()).toEqual([
        'audit_logs_created_at_idx',
        'audit_logs_user_id_idx',
        'audit_logs_workspace_created_idx',
        'audit_logs_workspace_id_idx',
        'audit_logs_ws_entity_action_idx',
      ]);

      after.run(`DELETE FROM workspaces WHERE id = 'ws-1'`);
      const survivors = auditRows(after);
      expect(survivors).toHaveLength(3);
      expect(survivors.every((row) => row.workspace_id === null && row.user_id === null)).toBe(
        true
      );
    } finally {
      after.close();
    }
  });
});
