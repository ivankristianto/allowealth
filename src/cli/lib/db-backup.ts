import { Database } from 'bun:sqlite';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';

export type RestoreFormat = 'sqlite-db' | 'sql';

const SIDECAR_SUFFIXES = ['-wal', '-shm', '-journal'] as const;

export function removeSqliteSidecars(dbPath: string): void {
  for (const suffix of SIDECAR_SUFFIXES) {
    rmSync(`${dbPath}${suffix}`, { force: true });
  }
}

export function deleteSqliteDatabase(dbPath: string): void {
  rmSync(dbPath, { force: true });
  removeSqliteSidecars(dbPath);
}

function withPrivateUmask<T>(run: () => T): T {
  const previous = process.umask(0o077);
  try {
    return run();
  } finally {
    process.umask(previous);
  }
}

/** Throw unless `PRAGMA integrity_check` reports ok for the database at dbPath. */
export function verifyIntegrity(dbPath: string): void {
  const sqlite = new Database(dbPath, { readonly: true });
  try {
    const rows = sqlite
      .query<{ integrity_check: string }, []>('PRAGMA integrity_check')
      .all()
      .map((row) => row.integrity_check);
    if (rows.length !== 1 || rows[0] !== 'ok') {
      throw new Error(`Integrity check failed for ${dbPath}: ${rows.slice(0, 5).join('; ')}`);
    }
  } finally {
    sqlite.close();
  }
}

/**
 * Write a consistent single-file copy of a possibly live database with VACUUM INTO.
 * Unlike a file copy, it includes WAL frames that have not been checkpointed yet.
 */
export function backupDatabase(sourcePath: string, destPath: string): void {
  if (!existsSync(sourcePath)) {
    throw new Error(`SQLite database not found at ${sourcePath}.`);
  }
  if (existsSync(destPath)) {
    throw new Error(`Backup destination already exists: ${destPath}`);
  }

  withPrivateUmask(() => {
    mkdirSync(dirname(destPath), { recursive: true });
    const source = new Database(sourcePath, { readonly: true });
    try {
      source.query('VACUUM INTO ?').run(destPath);
    } finally {
      source.close();
    }
  });
  chmodSync(destPath, 0o600);
}

function buildRestoreCandidate(sourcePath: string, format: RestoreFormat, tempPath: string): void {
  if (format === 'sqlite-db') {
    verifyIntegrity(sourcePath);
    backupDatabase(sourcePath, tempPath);
    return;
  }

  // A dump replayed into the live file would merge with or collide against existing rows.
  const fresh = withPrivateUmask(() => new Database(tempPath, { create: true }));
  try {
    fresh.run(readFileSync(sourcePath, 'utf8'));
    fresh.run('PRAGMA journal_mode = DELETE');
  } finally {
    fresh.close();
  }
  chmodSync(tempPath, 0o600);
}

/**
 * Replace targetPath with the backup at sourcePath; the server must be stopped first.
 * Builds and verifies a temp file beside the target, clears stale -wal/-shm, then renames.
 */
export function restoreDatabase(
  sourcePath: string,
  format: RestoreFormat,
  targetPath: string
): void {
  const tempPath = `${targetPath}.restore-${process.pid}-${Date.now()}.tmp`;
  mkdirSync(dirname(targetPath), { recursive: true });

  try {
    buildRestoreCandidate(sourcePath, format, tempPath);
    verifyIntegrity(tempPath);
    removeSqliteSidecars(tempPath);
    // Old WAL frames replayed onto the restored file would corrupt it.
    removeSqliteSidecars(targetPath);
    renameSync(tempPath, targetPath);
  } catch (error) {
    deleteSqliteDatabase(tempPath);
    throw error;
  }
}
