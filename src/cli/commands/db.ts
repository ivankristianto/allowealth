/* eslint-disable no-console -- CLI output is intentional */
import {
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readSync,
  statSync,
} from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { defineCommand } from 'citty';
import { exec } from '../lib/exec';
import { targetArg } from '../lib/target';

const D1_DATABASE_NAME = 'allowealth-db';
const DEFAULT_BACKUP_DIR = 'backups';
const SCHEMA_DETECTION_BUFFER_SIZE = 256 * 1024;

type BackupFormat = 'sql' | 'gzip-sql' | 'sqlite-db';

function timestampForFile(date = new Date()): string {
  return date.toISOString().replace(/[:]/g, '-').replace(/\..+$/, '');
}

function listBackups(
  dir: string
): Array<{ path: string; name: string; mtime: number; size: number }> {
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .map((entry) => {
      const fullPath = resolve(dir, entry);
      const stats = statSync(fullPath);
      return stats.isFile()
        ? {
            path: fullPath,
            name: entry,
            mtime: stats.mtimeMs,
            size: stats.size,
          }
        : null;
    })
    .filter(
      (value): value is { path: string; name: string; mtime: number; size: number } =>
        value !== null
    )
    .sort((a, b) => b.mtime - a.mtime);
}

function detectBackupFormat(filePath: string): BackupFormat {
  const ext = extname(filePath).toLowerCase();
  const header = Buffer.alloc(8);
  const fd = openSync(filePath, 'r');
  try {
    readSync(fd, header, 0, header.length, 0);
  } finally {
    closeSync(fd);
  }

  if (header[0] === 0x1f && header[1] === 0x8b) {
    return 'gzip-sql';
  }

  if (ext === '.db' || ext === '.sqlite' || ext === '.sqlite3') {
    return 'sqlite-db';
  }

  return 'sql';
}

function validateBackupFile(filePath: string, format: BackupFormat): void {
  const stats = statSync(filePath);
  if (stats.size <= 0) {
    throw new Error('Backup file is empty.');
  }

  if (format === 'gzip-sql') {
    execFileSync('gzip', ['-t', filePath], { stdio: 'pipe' });
    return;
  }

  if (format === 'sql') {
    const sampleBuffer = Buffer.alloc(4096);
    const fd = openSync(filePath, 'r');
    let bytesRead: number;
    try {
      bytesRead = readSync(fd, sampleBuffer, 0, sampleBuffer.length, 0);
    } finally {
      closeSync(fd);
    }
    const sample = sampleBuffer.subarray(0, bytesRead).toString('utf8');
    if (!sample.trim()) {
      throw new Error('SQL backup file is empty.');
    }
  }
}

function detectSchemaVersion(filePath: string, format: BackupFormat): string | null {
  if (format !== 'sql') {
    return null;
  }

  const sampleBuffer = Buffer.alloc(SCHEMA_DETECTION_BUFFER_SIZE);
  const fd = openSync(filePath, 'r');
  let bytesRead: number;
  try {
    bytesRead = readSync(fd, sampleBuffer, 0, sampleBuffer.length, 0);
  } finally {
    closeSync(fd);
  }
  const sample = sampleBuffer.subarray(0, bytesRead).toString('utf8');

  const matches = Array.from(
    sample.matchAll(
      /INSERT INTO ["`]?__drizzle_migrations["`]?(?:\s*\([^)]*\))?\s*VALUES\s*\([^)]*'([^']+)'/gi
    )
  );
  return matches.at(-1)?.[1] ?? null;
}

function printBackupList(backups: Array<{ name: string; size: number; mtime: number }>): void {
  if (backups.length === 0) {
    console.log('No backups found.');
    return;
  }

  console.log('\nAvailable backups:');
  for (const backup of backups.slice(0, 10)) {
    console.log(
      `- ${backup.name} (${(backup.size / 1024).toFixed(1)} KiB, ${new Date(backup.mtime).toISOString()})`
    );
  }
}

async function requireRestoreConfirmation(force?: boolean): Promise<void> {
  if (force) {
    return;
  }
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await new Promise<string>((resolveAnswer) => {
    rl.question('Type "yes" or "y" to confirm restore: ', (value) => {
      rl.close();
      resolveAnswer(value.trim().toLowerCase());
    });
  });
  if (answer !== 'yes' && answer !== 'y') {
    throw new Error('Restore aborted by user.');
  }
}

function backupToPath(target: string, outputPath: string): void {
  mkdirSync(dirname(outputPath), { recursive: true });

  if (target === 'sqlite') {
    const dbPath = resolve('db/.dev.db');
    if (!existsSync(dbPath)) {
      throw new Error(`SQLite database not found at ${dbPath}.`);
    }
    copyFileSync(dbPath, outputPath);
    console.log(`✅ SQLite backup created: ${outputPath}`);
    return;
  }

  if (target === 'd1' || target === 'd1-local') {
    exec('wrangler', [
      'd1',
      'export',
      D1_DATABASE_NAME,
      target === 'd1-local' ? '--local' : '--remote',
      '--output',
      outputPath,
    ]);
    return;
  }

  throw new Error(`Unsupported target for backup: ${target}`);
}

export default defineCommand({
  meta: { name: 'db', description: 'Database management commands' },
  subCommands: {
    setup: defineCommand({
      meta: { name: 'setup', description: 'Create database tables from schema (no migrations)' },
      args: {
        target: targetArg,
      },
      async run({ args }) {
        const { resolveTarget, isD1 } = await import('../lib/target');
        await resolveTarget(args);

        if (isD1()) {
          console.error('❌ D1 setup should be done via Wrangler.');
          console.error('   Use: wrangler d1 execute <db-name> --file=./src/db/setup.sql');
          process.exit(1);
        } else {
          exec('bun', ['run', 'src/db/setup.ts']);
        }
      },
    }),
    migrate: defineCommand({
      meta: { name: 'migrate', description: 'Apply pending database migrations' },
      args: {
        target: targetArg,
      },
      async run({ args }) {
        const { resolveTarget, isD1, isD1Local } = await import('../lib/target');
        await resolveTarget(args);

        if (isD1()) {
          const { migrateD1 } = await import('../lib/d1-migrate');
          await migrateD1({ local: isD1Local() });
        } else {
          exec('drizzle-kit', ['migrate']);
        }
      },
    }),
    generate: defineCommand({
      meta: { name: 'generate', description: 'Generate migration from schema changes' },
      run() {
        exec('drizzle-kit', ['generate']);
      },
    }),
    push: defineCommand({
      meta: { name: 'push', description: 'Push schema directly to database (dev only)' },
      run() {
        exec('drizzle-kit', ['push']);
      },
    }),
    studio: defineCommand({
      meta: { name: 'studio', description: 'Open Drizzle Studio visual DB browser' },
      run() {
        exec('drizzle-kit', ['studio']);
      },
    }),
    seed: defineCommand({
      meta: { name: 'seed', description: 'Seed database with demo data' },
      args: {
        target: targetArg,
        months: {
          type: 'string',
          description: 'Number of months to seed transactions for (default: 3)',
          default: '3',
        },
        transactions: {
          type: 'string',
          description: 'Number of extra transactions to add (default: 0)',
          default: '0',
        },
        benchmark: {
          type: 'boolean',
          description: 'Legacy: Add ~10k benchmark transactions (equivalent to --months=12)',
          default: false,
        },
        stress: {
          type: 'boolean',
          description:
            'Legacy: Seed 5 years of family stress-test data (equivalent to --months=60)',
          default: false,
        },
      },
      async run({ args }) {
        const { resolveTarget } = await import('../lib/target');
        await resolveTarget(args);
        const seedArgs = ['run', 'src/db/seed/index.ts'];
        if (args.benchmark) {
          seedArgs.push('--benchmark');
        } else if (args.stress) {
          seedArgs.push('--stress');
        } else {
          seedArgs.push(`--months=${args.months}`);
          if (args.transactions !== '0') {
            seedArgs.push(`--transactions=${args.transactions}`);
          }
        }
        exec('bun', seedArgs);
      },
    }),
    reset: defineCommand({
      meta: { name: 'reset', description: 'Delete SQLite DB, push schema, and seed (dev only)' },
      args: {
        target: targetArg,
      },
      async run({ args }) {
        const { resolveTarget, getTarget } = await import('../lib/target');
        await resolveTarget(args);

        if (getTarget() !== 'sqlite') {
          console.error('Error: "db reset" is only supported for the sqlite target.');
          process.exit(1);
        }
        console.log('Resetting database...');
        exec('rm', ['-f', 'db/.dev.db', 'db/.dev.db-wal', 'db/.dev.db-shm']);
        exec('mkdir', ['-p', 'db']);
        exec('bun', ['run', 'src/db/setup.ts']);
        exec('bun', ['run', 'src/db/seed/index.ts']);
      },
    }),
    empty: defineCommand({
      meta: { name: 'empty', description: 'Truncate all data (preserve schema)' },
      args: {
        target: targetArg,
      },
      async run({ args }) {
        const { resolveTarget } = await import('../lib/target');
        await resolveTarget(args);
        exec('bun', ['run', 'src/db/empty.ts']);
      },
    }),
    drop: defineCommand({
      meta: {
        name: 'drop',
        description: '⚠️  DANGEROUS: Delete all tables and reset database',
      },
      args: {
        target: targetArg,
      },
      async run({ args }) {
        const { resolveTarget, getTarget, isD1, isD1Local } = await import('../lib/target');
        await resolveTarget(args);

        const target = getTarget();

        // Show warning and require confirmation
        console.error('\n⚠️  DANGER ZONE ⚠️');
        console.error('This command will DELETE ALL TABLES and reset the database.');
        console.error(`Target: ${target}`);

        if (target === 'd1' || target === 'd1-local') {
          console.error('This will drop all tables on D1 (including production if --target d1).');
        }

        console.error('\nType "yes" to confirm:');

        // Read confirmation from stdin
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stderr,
        });

        const confirmation = await new Promise<string>((resolve) => {
          rl.question('', (answer) => {
            rl.close();
            resolve(answer.trim());
          });
        });

        if (confirmation !== 'yes') {
          console.error('\nAborted.');
          process.exit(1);
        }

        console.error('\nDropping all tables...\n');

        if (isD1()) {
          const { dropD1Tables } = await import('../lib/d1-migrate');
          await dropD1Tables({ local: isD1Local() });
        } else if (target === 'sqlite') {
          exec('rm', ['-f', 'db/.dev.db', 'db/.dev.db-wal', 'db/.dev.db-shm']);
          console.log('✅ SQLite database file deleted.');
        }

        console.log('\n✅ Database dropped. Run "aw db migrate" to recreate schema.\n');
      },
    }),
    backup: defineCommand({
      meta: { name: 'backup', description: 'Create database backup' },
      args: {
        target: targetArg,
        output: {
          type: 'string',
          description: 'Output backup path. Defaults to backups/<target>-<timestamp>.{sql|db}',
        },
      },
      async run({ args }) {
        const { resolveTarget, getTarget } = await import('../lib/target');
        await resolveTarget(args);
        const target = getTarget();

        const defaultExt = target === 'sqlite' ? 'db' : 'sql';
        const outputPath =
          (args.output as string | undefined) ??
          resolve(DEFAULT_BACKUP_DIR, `${target}-${timestampForFile()}.${defaultExt}`);

        backupToPath(target, outputPath);
        console.log(`✅ Backup created: ${outputPath}`);
      },
    }),
    restore: defineCommand({
      meta: { name: 'restore', description: 'Safely restore database from backup' },
      args: {
        target: targetArg,
        source: {
          type: 'string',
          description: 'Backup source: local or cloud',
          default: 'local',
        },
        file: {
          type: 'string',
          description: 'Backup file path. If omitted, latest backup from selected source is used',
        },
        'backups-dir': {
          type: 'string',
          description: 'Directory for local backups',
          default: DEFAULT_BACKUP_DIR,
        },
        'cloud-dir': {
          type: 'string',
          description: 'Directory for cloud backups mirror',
          default: 'backups/cloud',
        },
        'dry-run': {
          type: 'boolean',
          description: 'Validate backup and print metadata without restoring',
          default: false,
        },
        'no-backup': {
          type: 'boolean',
          description: 'Skip automatic pre-restore backup',
          default: false,
        },
        force: {
          type: 'boolean',
          description: 'Skip restore confirmation prompt',
          default: false,
        },
      },
      async run({ args }) {
        const { resolveTarget, getTarget } = await import('../lib/target');
        await resolveTarget(args);
        const target = getTarget();

        const source = (args.source as string).toLowerCase();
        if (source !== 'local' && source !== 'cloud') {
          throw new Error(`Invalid --source "${source}". Allowed values: local, cloud`);
        }
        const sourceDir = resolve(
          source === 'cloud' ? (args['cloud-dir'] as string) : (args['backups-dir'] as string)
        );
        const allBackups = listBackups(sourceDir);

        // Filter backups by target compatibility (filename starts with target name)
        const compatibleBackups = allBackups.filter((b) =>
          b.name.toLowerCase().startsWith(`${target}-`)
        );
        printBackupList(compatibleBackups);

        const selectedFile = (args.file as string | undefined)
          ? resolve(args.file as string)
          : compatibleBackups[0]?.path;

        if (!selectedFile || !existsSync(selectedFile)) {
          throw new Error(
            `No compatible backup found for target "${target}". ` +
              `Provide --file or place ${target}-* backups in ${sourceDir}`
          );
        }

        const backupStats = statSync(selectedFile);
        const format = detectBackupFormat(selectedFile);
        validateBackupFile(selectedFile, format);

        // Validate target/format compatibility
        const validFormatsForTarget: Record<string, BackupFormat[]> = {
          sqlite: ['sql', 'sqlite-db'],
          d1: ['sql'],
          'd1-local': ['sql'],
        };
        const validFormats = validFormatsForTarget[target];
        if (validFormats && !validFormats.includes(format)) {
          throw new Error(
            `Format "${format}" is not valid for target "${target}". ` +
              `Valid formats: ${validFormats.join(', ')}`
          );
        }

        const schemaVersion = detectSchemaVersion(selectedFile, format);

        console.log('\nRestore preview:');
        console.log(`- source: ${source}`);
        console.log(`- file: ${selectedFile}`);
        console.log(`- size: ${(backupStats.size / 1024).toFixed(1)} KiB`);
        console.log(`- timestamp: ${new Date(backupStats.mtime).toISOString()}`);
        console.log(`- format: ${format}`);
        console.log(`- schema version: ${schemaVersion ?? 'unknown'}`);

        if (args['dry-run']) {
          console.log('\n✅ Dry-run completed. Backup validated successfully.');
          return;
        }

        await requireRestoreConfirmation(Boolean(args.force));

        if (!args['no-backup']) {
          const preRestorePath = resolve(
            args['backups-dir'] as string,
            `pre-restore-${timestampForFile()}.${target === 'sqlite' ? 'db' : 'sql'}`
          );
          backupToPath(target, preRestorePath);
          console.log(`✅ Pre-restore backup created: ${preRestorePath}`);
        }

        if (target === 'sqlite') {
          if (format === 'sqlite-db') {
            copyFileSync(selectedFile, resolve('db/.dev.db'));
          } else if (format === 'sql') {
            execFileSync('sqlite3', [resolve('db/.dev.db'), '.read', selectedFile], {
              stdio: 'inherit',
            });
          } else {
            throw new Error(`Format "${format}" is not supported for SQLite restore.`);
          }
        } else if (target === 'd1' || target === 'd1-local') {
          exec('wrangler', [
            'd1',
            'execute',
            D1_DATABASE_NAME,
            target === 'd1-local' ? '--local' : '--remote',
            '--file',
            selectedFile,
          ]);
        }

        console.log(`\n✅ Restore completed from ${basename(selectedFile)}.`);
      },
    }),
  },
});
