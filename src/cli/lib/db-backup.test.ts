import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { backupDatabase, restoreDatabase, verifyIntegrity } from './db-backup';

const TMP_ROOT = join(resolve(import.meta.dir, '..', '..', '..'), 'tmp-test');
let tmpDir = '';

function rowValues(dbPath: string): number[] {
  const sqlite = new Database(dbPath, { readonly: true });
  const rows = sqlite.query<{ x: number }, []>('SELECT x FROM t ORDER BY x').all();
  sqlite.close();
  return rows.map((row) => row.x);
}

function createWalDb(dbPath: string, values: number[]): Database {
  const sqlite = new Database(dbPath);
  sqlite.run(
    'PRAGMA journal_mode = WAL; PRAGMA wal_autocheckpoint = 0; CREATE TABLE t (x INTEGER)'
  );
  const insert = sqlite.query('INSERT INTO t (x) VALUES (?)');
  values.forEach((value) => insert.run(value));
  return sqlite;
}

beforeAll(() => {
  mkdirSync(TMP_ROOT, { recursive: true });
  tmpDir = mkdtempSync(join(TMP_ROOT, 'db-backup-'));
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('backupDatabase', () => {
  it('includes writes still sitting in an uncheckpointed WAL', () => {
    const sourcePath = join(tmpDir, 'live.db');
    const writer = createWalDb(sourcePath, [1, 2, 3]);
    try {
      expect(statSync(`${sourcePath}-wal`).size).toBeGreaterThan(0);

      const destPath = join(tmpDir, 'backups', 'live-copy.db');
      backupDatabase(sourcePath, destPath);

      expect(rowValues(destPath)).toEqual([1, 2, 3]);
      expect(statSync(destPath).mode & 0o777).toBe(0o600);
    } finally {
      writer.close();
    }
  });

  it('refuses to overwrite an existing destination', () => {
    const sourcePath = join(tmpDir, 'src-for-existing.db');
    createWalDb(sourcePath, [1]).close();
    const destPath = join(tmpDir, 'already-there.db');
    writeFileSync(destPath, '');
    expect(() => backupDatabase(sourcePath, destPath)).toThrow('already exists');
  });
});

describe('restoreDatabase', () => {
  it('replaces the data and leaves no stale WAL or SHM behind', () => {
    const targetPath = join(tmpDir, 'target.db');
    createWalDb(targetPath, [1, 2, 3]).close();
    writeFileSync(`${targetPath}-wal`, 'stale wal from the old database');
    writeFileSync(`${targetPath}-shm`, 'stale shm');

    const backupPath = join(tmpDir, 'backup.db');
    createWalDb(backupPath, [7, 8]).close();

    restoreDatabase(backupPath, 'sqlite-db', targetPath);

    expect(existsSync(`${targetPath}-wal`)).toBe(false);
    expect(existsSync(`${targetPath}-shm`)).toBe(false);
    expect(rowValues(targetPath)).toEqual([7, 8]);
    expect(() => verifyIntegrity(targetPath)).not.toThrow();
  });

  it('loads a SQL dump into a fresh database, not the populated target', () => {
    const targetPath = join(tmpDir, 'dump-target.db');
    createWalDb(targetPath, [1, 2, 3]).close();

    const dumpPath = join(tmpDir, 'backup.sql');
    writeFileSync(
      dumpPath,
      'BEGIN TRANSACTION;\nCREATE TABLE t (x INTEGER);\nINSERT INTO t VALUES (42);\nCOMMIT;\n'
    );

    restoreDatabase(dumpPath, 'sql', targetPath);

    expect(rowValues(targetPath)).toEqual([42]);
    expect(existsSync(`${targetPath}-wal`)).toBe(false);
  });

  it('keeps the target untouched when the source is not a valid database', () => {
    const targetPath = join(tmpDir, 'keep-target.db');
    createWalDb(targetPath, [5]).close();
    const badPath = join(tmpDir, 'corrupt.db');
    writeFileSync(badPath, 'definitely not sqlite');

    expect(() => restoreDatabase(badPath, 'sqlite-db', targetPath)).toThrow();
    expect(rowValues(targetPath)).toEqual([5]);
  });
});
