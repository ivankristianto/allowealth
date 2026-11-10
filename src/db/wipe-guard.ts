import { Database } from 'bun:sqlite';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { getDatabaseConfig } from './config';
import { SEED_EMAIL_DOMAIN } from './seed/config';

export interface WipeFlags {
  yes: boolean;
  force: boolean;
}

export interface WipeGuardOptions extends WipeFlags {
  dbPath: string;
  action: string;
}

export interface WipeGuardVerdict {
  allowed: boolean;
  message: string;
}

const USER_TABLES = ['users', 'user'] as const;

/** Absolute path of the SQLite file the app and the seed scripts will open. */
export function resolveDatabasePath(url = getDatabaseConfig().url): string {
  return resolve(url);
}

export function parseWipeFlags(argv: readonly string[]): WipeFlags {
  return { yes: argv.includes('--yes'), force: argv.includes('--force') };
}

/**
 * Count distinct user emails outside the seed domain, across the app and Better Auth user tables.
 * Throws when the file exists but cannot be read, so callers can fail closed.
 */
export function countNonDemoUsers(dbPath: string): number {
  if (!existsSync(dbPath)) {
    return 0;
  }

  // readonly so inspecting a target never creates or migrates anything
  const sqlite = new Database(dbPath, { readonly: true });
  try {
    const present = sqlite
      .query<{ name: string }, []>(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('users', 'user')`
      )
      .all()
      .map((row) => row.name);
    const tables = USER_TABLES.filter((table) => present.includes(table));
    if (tables.length === 0) {
      return 0;
    }

    const emails = tables.map((table) => `SELECT lower(email) AS email FROM "${table}"`);
    const row = sqlite
      .query<{ count: number }, [string]>(
        `SELECT COUNT(*) AS count FROM (${emails.join(' UNION ')}) WHERE email NOT LIKE ?`
      )
      .get(`%@${SEED_EMAIL_DOMAIN}`);
    return row?.count ?? 0;
  } finally {
    sqlite.close();
  }
}

export function checkWipeGuard({ dbPath, action, yes, force }: WipeGuardOptions): WipeGuardVerdict {
  const target = `${action} ${dbPath}`;

  if (!yes) {
    return {
      allowed: false,
      message: `Refusing to ${target}: this deletes its data. Re-run with --yes to confirm.`,
    };
  }

  let realUsers: number;
  try {
    realUsers = countNonDemoUsers(dbPath);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return force
      ? {
          allowed: true,
          message: `About to ${target} (could not inspect it: ${reason}; --force given).`,
        }
      : {
          allowed: false,
          message: `Refusing to ${target}: could not inspect it (${reason}). Add --force to proceed anyway.`,
        };
  }

  if (realUsers === 0) {
    return {
      allowed: true,
      message: `About to ${target} (no users outside @${SEED_EMAIL_DOMAIN}).`,
    };
  }

  const users = `${realUsers} user${realUsers === 1 ? '' : 's'} outside @${SEED_EMAIL_DOMAIN}`;
  return force
    ? { allowed: true, message: `About to ${target}; --force given, ${users} will be lost.` }
    : {
        allowed: false,
        message: `Refusing to ${target}: it holds ${users}, which looks like real data. Add --force as well as --yes if you really mean it.`,
      };
}

/** Print the verdict and exit the process when the wipe is not allowed. */
export function enforceWipeGuard(options: WipeGuardOptions): void {
  const verdict = checkWipeGuard(options);
  if (!verdict.allowed) {
    process.stderr.write(`❌ ${verdict.message}\n`);
    process.exit(1);
  }
  process.stdout.write(`⚠️  ${verdict.message}\n`);
}
