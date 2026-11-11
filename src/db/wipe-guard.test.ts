import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  checkWipeGuard,
  countNonDemoUsers,
  parseWipeFlags,
  resolveDatabasePath,
} from './wipe-guard';

const REPO_ROOT = resolve(import.meta.dir, '..', '..');
const TMP_ROOT = join(REPO_ROOT, 'tmp-test');
let tmpDir = '';

function createUserTables(dbPath: string, emails: string[]): void {
  const sqlite = new Database(dbPath);
  sqlite.run('CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL)');
  sqlite.run('CREATE TABLE user (id TEXT PRIMARY KEY, email TEXT NOT NULL)');
  emails.forEach((email, index) => {
    sqlite.query('INSERT INTO users (id, email) VALUES (?, ?)').run(`u${index}`, email);
    sqlite.query('INSERT INTO user (id, email) VALUES (?, ?)').run(`u${index}`, email);
  });
  sqlite.close();
}

function insertRealUser(dbPath: string): void {
  const sqlite = new Database(dbPath);
  sqlite
    .query(
      `INSERT INTO users (id, email, name, role, created_at, updated_at) VALUES ('real', 'owner@household.test', 'Owner', 'admin', 0, 0)`
    )
    .run();
  sqlite.close();
}

function countUsers(dbPath: string): number {
  const sqlite = new Database(dbPath, { readonly: true });
  const row = sqlite.query<{ count: number }, []>('SELECT COUNT(*) AS count FROM users').get();
  sqlite.close();
  return row?.count ?? 0;
}

function runScript(script: string, dbPath: string, args: string[]) {
  return spawnSync('bun', ['run', script, ...args], {
    cwd: REPO_ROOT,
    env: { ...process.env, DATABASE_URL: dbPath, NODE_ENV: 'development' },
    encoding: 'utf8',
  });
}

beforeAll(() => {
  mkdirSync(TMP_ROOT, { recursive: true });
  tmpDir = mkdtempSync(join(TMP_ROOT, 'wipe-guard-'));
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('parseWipeFlags', () => {
  it('reads --yes and --force from argv', () => {
    expect(parseWipeFlags(['--months=3'])).toEqual({ yes: false, force: false });
    expect(parseWipeFlags(['--yes', '--force'])).toEqual({ yes: true, force: true });
  });
});

describe('resolveDatabasePath', () => {
  it('returns an absolute path for a relative DATABASE_URL', () => {
    expect(resolveDatabasePath('db/.dev.db')).toBe(resolve('db/.dev.db'));
  });
});

describe('countNonDemoUsers', () => {
  it('treats a missing file as empty without creating it', () => {
    const dbPath = join(tmpDir, 'missing.db');
    expect(countNonDemoUsers(dbPath)).toBe(0);
    expect(Bun.file(dbPath).size).toBe(0);
  });

  it('counts each real email once across both user tables', () => {
    const dbPath = join(tmpDir, 'mixed.db');
    createUserTables(dbPath, [
      'demo@example.com',
      'Owner@Household.test',
      'partner@household.test',
    ]);
    expect(countNonDemoUsers(dbPath)).toBe(2);
  });
});

describe('checkWipeGuard', () => {
  it('refuses without --yes and names the absolute path', () => {
    const dbPath = join(tmpDir, 'empty-no-yes.db');
    const verdict = checkWipeGuard({ dbPath, action: 'seed', yes: false, force: false });
    expect(verdict.allowed).toBe(false);
    expect(verdict.message).toContain(dbPath);
    expect(verdict.message).toContain('--yes');
  });

  it('refuses a DB with real-looking users unless --force is given', () => {
    const dbPath = join(tmpDir, 'real.db');
    createUserTables(dbPath, ['demo@example.com', 'owner@household.test']);

    const refused = checkWipeGuard({ dbPath, action: 'seed', yes: true, force: false });
    expect(refused.allowed).toBe(false);
    expect(refused.message).toContain(dbPath);
    expect(refused.message).toContain('1 user outside @example.com');
    expect(refused.message).not.toContain('owner@household.test');

    expect(checkWipeGuard({ dbPath, action: 'seed', yes: true, force: true }).allowed).toBe(true);
  });

  it('allows an empty or missing DB with --yes', () => {
    const missing = join(tmpDir, 'not-there.db');
    expect(
      checkWipeGuard({ dbPath: missing, action: 'seed', yes: true, force: false }).allowed
    ).toBe(true);

    const noTables = join(tmpDir, 'no-tables.db');
    new Database(noTables).close();
    expect(
      checkWipeGuard({ dbPath: noTables, action: 'seed', yes: true, force: false }).allowed
    ).toBe(true);
  });

  it('allows a demo-only DB with --yes', () => {
    const dbPath = join(tmpDir, 'demo.db');
    createUserTables(dbPath, ['demo@example.com', 'member@example.com', 'superadmin@example.com']);
    const verdict = checkWipeGuard({ dbPath, action: 'seed', yes: true, force: false });
    expect(verdict.allowed).toBe(true);
    expect(verdict.message).toContain(dbPath);
  });

  it('fails closed when the file cannot be read as SQLite', () => {
    const dbPath = join(tmpDir, 'garbage.db');
    writeFileSync(dbPath, 'not a sqlite database, just some bytes long enough to have a header');
    expect(checkWipeGuard({ dbPath, action: 'seed', yes: true, force: false }).allowed).toBe(false);
    expect(checkWipeGuard({ dbPath, action: 'seed', yes: true, force: true }).allowed).toBe(true);
  });
});

describe('wipe entry points keep a database that holds real users', () => {
  let dbPath = '';

  beforeAll(() => {
    dbPath = join(tmpDir, 'entry-points.db');
    const setup = spawnSync('bun', ['run', 'src/db/migrate.ts'], {
      cwd: REPO_ROOT,
      env: { ...process.env, DATABASE_URL: dbPath },
      encoding: 'utf8',
    });
    expect(setup.status).toBe(0);
    insertRealUser(dbPath);
  }, 30000);

  for (const script of ['src/db/seed/index.ts', 'src/db/empty.ts']) {
    it(`${script} refuses with --yes but without --force`, () => {
      const result = runScript(script, dbPath, ['--yes']);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(dbPath);
      expect(countUsers(dbPath)).toBe(1);
    });

    it(`${script} refuses without --yes`, () => {
      const result = runScript(script, dbPath, []);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('--yes');
      expect(countUsers(dbPath)).toBe(1);
    });
  }
});
