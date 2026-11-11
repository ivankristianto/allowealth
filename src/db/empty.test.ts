import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { getTableName, is } from 'drizzle-orm';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';
import * as schema from '@/db/schema/sqlite';
import * as userMfa from '@/db/schema/sqlite/user-mfa';
import * as userMfaBackupCodes from '@/db/schema/sqlite/user-mfa-backup-codes';
import { applyMigrations } from './test-helpers/migrations';

const REPO_ROOT = resolve(import.meta.dir, '..', '..');
const KEPT_TABLE = '__drizzle_migrations';
const tmpDir = mkdtempSync(join(tmpdir(), 'aw-empty-'));
let dbPath = '';

interface ColumnInfo {
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

function schemaTableNames(): string[] {
  return [schema, userMfa, userMfaBackupCodes]
    .flatMap((module) => Object.values(module))
    .filter((value): value is SQLiteTable => is(value, SQLiteTable))
    .map((table) => getTableName(table));
}

function databaseTableNames(sqlite: Database): string[] {
  return sqlite
    .query<{ name: string }, []>(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
    )
    .all()
    .map((row) => row.name);
}

function countRows(sqlite: Database, table: string): number {
  return sqlite.query<{ n: number }, []>(`SELECT COUNT(*) AS n FROM "${table}"`).get()!.n;
}

function placeholderValue(table: string, column: ColumnInfo): string | number | Uint8Array {
  // The wipe guard only lets --yes through when every user is a seed account
  if (column.name.toLowerCase().includes('email')) return `${table}@example.com`;
  const type = column.type.toUpperCase();
  if (type.includes('INT') || type.includes('REAL') || type.includes('NUM')) return 1;
  if (type.includes('BLOB')) return new Uint8Array([0]);
  return `${table}-${column.name}`;
}

/** One row in every table, foreign keys off, so the test sees the whole schema non-empty. */
function fillEveryTable(sqlite: Database): void {
  sqlite.run('PRAGMA foreign_keys = OFF');
  for (const table of databaseTableNames(sqlite).filter((name) => name !== KEPT_TABLE)) {
    const columns = sqlite.query<ColumnInfo, []>(`PRAGMA table_info("${table}")`).all();
    const required = columns.filter((c) => (c.notnull || c.pk) && c.dflt_value === null);
    const names = required.map((c) => `"${c.name}"`).join(', ');
    const marks = required.map(() => '?').join(', ');
    sqlite
      .query(`INSERT INTO "${table}" (${names}) VALUES (${marks})`)
      .run(...required.map((c) => placeholderValue(table, c)));
  }
}

function runEmpty(args: string[]) {
  return spawnSync('bun', ['run', 'src/db/empty.ts', ...args], {
    cwd: REPO_ROOT,
    env: { ...process.env, DATABASE_URL: dbPath, NODE_ENV: 'development' },
    encoding: 'utf8',
  });
}

function journalEntryCount(): number {
  const journal = JSON.parse(
    readFileSync(join(REPO_ROOT, 'drizzle/sqlite/meta/_journal.json'), 'utf8')
  ) as { entries: unknown[] };
  return journal.entries.length;
}

beforeEach(() => {
  dbPath = join(mkdtempSync(join(tmpDir, 'db-')), 'empty.test.db');
  const sqlite = new Database(dbPath);
  applyMigrations(sqlite);
  fillEveryTable(sqlite);
  sqlite.close();
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('db:empty', () => {
  it('empties every table in the schema and keeps the migration history', () => {
    const before = new Database(dbPath, { readonly: true });
    const tables = databaseTableNames(before);
    expect(schemaTableNames().filter((table) => !tables.includes(table))).toEqual([]);
    expect(tables.filter((table) => countRows(before, table) === 0)).toEqual([]);
    before.close();

    const result = runEmpty(['--yes']);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);

    const after = new Database(dbPath, { readonly: true });
    const leftovers = tables
      .filter((table) => table !== KEPT_TABLE)
      .map((table) => ({ table, rows: countRows(after, table) }))
      .filter(({ rows }) => rows > 0);
    expect(leftovers).toEqual([]);
    expect(countRows(after, KEPT_TABLE)).toBe(journalEntryCount());
    after.close();
  });

  it('fails and rolls back every table when one delete fails', () => {
    const sqlite = new Database(dbPath);
    sqlite.run(
      `CREATE TRIGGER block_accounts_delete BEFORE DELETE ON accounts
       BEGIN SELECT RAISE(ABORT, 'accounts are locked'); END`
    );
    sqlite.close();

    const result = runEmpty(['--yes']);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('accounts are locked');

    const after = new Database(dbPath, { readonly: true });
    expect(countRows(after, 'accounts')).toBe(1);
    expect(countRows(after, 'user')).toBe(1);
    expect(countRows(after, 'transactions')).toBe(1);
    after.close();
  });
});
