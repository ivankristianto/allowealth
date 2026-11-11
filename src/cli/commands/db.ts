/* eslint-disable no-console -- CLI output is intentional */
import {
  closeSync,
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
import { toWipeFlags, wipeArgs, wipeFlagArgv } from '../lib/wipe-args';

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

async function backupToPath(dbPath: string, outputPath: string): Promise<void> {
  const { backupDatabase } = await import('../lib/db-backup');
  console.log(`Backing up ${dbPath}`);
  backupDatabase(dbPath, outputPath);
  console.log(`✅ SQLite backup created: ${outputPath}`);
}

const superAdminArg = {
  type: 'boolean' as const,
  description: 'Also seed superadmin@example.com with a random password, printed once',
  default: false,
};

export default defineCommand({
  meta: { name: 'db', description: 'Database management commands' },
  subCommands: {
    migrate: defineCommand({
      meta: { name: 'migrate', description: 'Apply pending database migrations' },
      args: {
        target: targetArg,
      },
      async run({ args }) {
        const { resolveTarget } = await import('../lib/target');
        await resolveTarget(args);

        exec('bun', ['run', 'src/db/migrate.ts']);
      },
    }),
    generate: defineCommand({
      meta: { name: 'generate', description: 'Generate migration from schema changes' },
      run() {
        exec('drizzle-kit', ['generate']);
      },
    }),
    studio: defineCommand({
      meta: { name: 'studio', description: 'Open Drizzle Studio visual DB browser' },
      run() {
        exec('drizzle-kit', ['studio']);
      },
    }),
    docs: defineCommand({
      meta: {
        name: 'docs',
        description: 'Generate the schema diagram page (docs/architecture/database-schema.html)',
      },
      args: {
        out: {
          type: 'string',
          description: 'Output path (default: docs/architecture/database-schema.html)',
        },
      },
      async run({ args }) {
        const { runSchemaDocCommand } = await import('../lib/schema-doc');
        runSchemaDocCommand({ out: args.out as string | undefined });
      },
    }),
    seed: defineCommand({
      meta: { name: 'seed', description: 'Wipe the database and seed demo data' },
      args: {
        target: targetArg,
        ...wipeArgs,
        'with-super-admin': superAdminArg,
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

        const { resolveDatabasePath } = await import('@/db/wipe-guard');
        const dbPath = resolveDatabasePath();

        const seedArgs = ['run', 'src/db/seed/index.ts', ...wipeFlagArgv(toWipeFlags(args))];
        if (args['with-super-admin']) {
          seedArgs.push('--with-super-admin');
        }
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
        exec('bun', seedArgs, { DATABASE_URL: dbPath });
      },
    }),
    'seed-oauth-clients': defineCommand({
      meta: {
        name: 'seed-oauth-clients',
        description: 'Upsert pre-registered MCP OAuth clients',
      },
      async run() {
        const { db, getActiveSchema } = await import('@/db');
        const { nanoid } = await import('nanoid');
        const { getSeededMcpOAuthClients } = await import('@/lib/mcp-oauth');

        const schema = getActiveSchema();
        const clients = getSeededMcpOAuthClients();

        for (const client of clients) {
          const now = new Date();
          // Better Auth stores string[] fields as JSON text on SQLite.
          const row = {
            name: client.name,
            redirectUris: JSON.stringify(client.redirectUris),
            tokenEndpointAuthMethod: client.tokenEndpointAuthMethod,
            grantTypes: JSON.stringify(client.grantTypes),
            responseTypes: JSON.stringify(client.responseTypes),
            applicationType: client.applicationType,
            requirePKCE: client.requirePKCE,
            disabled: false,
            updatedAt: now,
          };

          await db
            .insert(schema.oauthClient)
            .values({ id: nanoid(), clientId: client.clientId, createdAt: now, ...row })
            .onConflictDoUpdate({ target: schema.oauthClient.clientId, set: row });

          console.log(`  ✓  Upserted: ${client.name}`);
        }

        console.log('\n✅ OAuth clients seeded.\n');
      },
    }),
    reset: defineCommand({
      meta: {
        name: 'reset',
        description: 'Delete the DATABASE_URL SQLite file, apply migrations, and seed (dev only)',
      },
      args: {
        target: targetArg,
        ...wipeArgs,
        'with-super-admin': superAdminArg,
      },
      async run({ args }) {
        const { resolveTarget } = await import('../lib/target');
        await resolveTarget(args);
        const { enforceWipeGuard, resolveDatabasePath } = await import('@/db/wipe-guard');
        const { deleteSqliteDatabase } = await import('../lib/db-backup');

        const dbPath = resolveDatabasePath();
        enforceWipeGuard({ dbPath, action: 'delete and recreate', ...toWipeFlags(args) });

        deleteSqliteDatabase(dbPath);
        mkdirSync(dirname(dbPath), { recursive: true });
        const env = { DATABASE_URL: dbPath };
        exec('bun', ['run', 'src/db/migrate.ts'], env);
        const seedArgs = ['run', 'src/db/seed/index.ts', '--yes'];
        if (args['with-super-admin']) {
          seedArgs.push('--with-super-admin');
        }
        exec('bun', seedArgs, env);
      },
    }),
    empty: defineCommand({
      meta: { name: 'empty', description: 'Truncate all data (preserve schema)' },
      args: {
        target: targetArg,
        ...wipeArgs,
      },
      async run({ args }) {
        const { resolveTarget } = await import('../lib/target');
        await resolveTarget(args);
        const { resolveDatabasePath } = await import('@/db/wipe-guard');
        exec('bun', ['run', 'src/db/empty.ts', ...wipeFlagArgv(toWipeFlags(args))], {
          DATABASE_URL: resolveDatabasePath(),
        });
      },
    }),
    drop: defineCommand({
      meta: {
        name: 'drop',
        description: '⚠️  DANGEROUS: Delete all tables and reset database',
      },
      args: {
        target: targetArg,
        ...wipeArgs,
      },
      async run({ args }) {
        const { resolveTarget } = await import('../lib/target');
        await resolveTarget(args);
        const { enforceWipeGuard, resolveDatabasePath } = await import('@/db/wipe-guard');
        const { deleteSqliteDatabase } = await import('../lib/db-backup');

        const dbPath = resolveDatabasePath();
        enforceWipeGuard({ dbPath, action: 'delete', ...toWipeFlags(args) });

        deleteSqliteDatabase(dbPath);
        console.log(`✅ SQLite database file deleted: ${dbPath}`);

        console.log('\n✅ Database dropped. Run "aw db migrate" to recreate schema.\n');
      },
    }),
    backup: defineCommand({
      meta: { name: 'backup', description: 'Create database backup' },
      args: {
        target: targetArg,
        output: {
          type: 'string',
          description: 'Output backup path. Defaults to backups/sqlite-<timestamp>.db',
        },
      },
      async run({ args }) {
        const { resolveTarget } = await import('../lib/target');
        await resolveTarget(args);

        const { resolveDatabasePath } = await import('@/db/wipe-guard');

        const outputPath = resolve(
          (args.output as string | undefined) ??
            resolve(DEFAULT_BACKUP_DIR, `sqlite-${timestampForFile()}.db`)
        );

        await backupToPath(resolveDatabasePath(), outputPath);
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
        ...wipeArgs,
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

        const validFormats: BackupFormat[] = ['sql', 'sqlite-db'];
        if (!validFormats.includes(format)) {
          throw new Error(
            `Format "${format}" is not a valid backup format. ` +
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

        const { enforceWipeGuard, resolveDatabasePath } = await import('@/db/wipe-guard');
        const { restoreDatabase } = await import('../lib/db-backup');
        const dbPath = resolveDatabasePath();

        console.log(`- restore target: ${dbPath}`);
        console.warn(
          '⚠️  Stop the app server first. A running server keeps writing to the old file.'
        );
        enforceWipeGuard({ dbPath, action: 'overwrite', ...toWipeFlags(args) });

        if (!args['no-backup'] && existsSync(dbPath)) {
          const preRestorePath = resolve(
            args['backups-dir'] as string,
            `pre-restore-${timestampForFile()}.db`
          );
          await backupToPath(dbPath, preRestorePath);
        }

        restoreDatabase(selectedFile, format === 'sqlite-db' ? 'sqlite-db' : 'sql', dbPath);

        console.log(`\n✅ Restore completed from ${basename(selectedFile)} into ${dbPath}.`);
      },
    }),
    prune: defineCommand({
      meta: { name: 'prune', description: 'Prune old data from the database' },
      subCommands: {
        'audit-logs': defineCommand({
          meta: {
            name: 'audit-logs',
            description: 'Delete audit log entries older than the retention period',
          },
          args: {
            target: targetArg,
            days: {
              type: 'string',
              description:
                'Retention period in days. Overrides AUDIT_LOG_RETENTION_DAYS env var (default: 30)',
            },
            'dry-run': {
              type: 'boolean',
              description: 'Preview deletions without executing',
              default: false,
            },
            force: {
              type: 'boolean',
              description: 'Skip confirmation prompt',
              default: false,
            },
          },
          async run({ args }) {
            const { resolveTarget } = await import('../lib/target');
            await resolveTarget(args);

            const daysRaw =
              (args.days as string | undefined) ?? process.env.AUDIT_LOG_RETENTION_DAYS ?? '30';
            const days = parseInt(daysRaw, 10);

            if (!Number.isFinite(days) || days < 1) {
              console.error('❌ Retention period must be at least 1 day.');
              process.exit(1);
            }

            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);

            const { db, auditLogs } = await import('@/db');
            const { lt, sql, inArray } = await import('drizzle-orm');

            const [countResult] = await (db as any)
              .select({ count: sql<number>`count(*)` })
              .from(auditLogs)
              .where(lt(auditLogs.created_at, cutoff));

            const count = Number(countResult?.count ?? 0);
            const entriesLabel = count === 1 ? 'entry' : 'entries';
            const daysLabel = days === 1 ? 'day' : 'days';

            console.log(
              `Found ${count} audit log ${entriesLabel} older than ${days} ${daysLabel} (before ${cutoff.toISOString()}).`
            );

            if (args['dry-run']) {
              console.log('\n✅ Dry-run completed. No entries were deleted.');
              return;
            }

            if (count === 0) {
              console.log('Nothing to prune.');
              return;
            }

            if (!args.force) {
              const readline = await import('readline');
              const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
              });
              const answer = await new Promise<string>((resolveAnswer) => {
                rl.question(
                  `Delete ${count} audit log ${entriesLabel}? Type "yes" or "y" to confirm: `,
                  (value) => {
                    rl.close();
                    resolveAnswer(value.trim().toLowerCase());
                  }
                );
              });

              if (answer !== 'yes' && answer !== 'y') {
                console.log('Aborted.');
                return;
              }
            }

            // Select IDs to delete (for batching if needed)
            const entriesToDelete = await (db as any)
              .select({ id: auditLogs.id })
              .from(auditLogs)
              .where(lt(auditLogs.created_at, cutoff));

            const ids = entriesToDelete.map((e: { id: string }) => e.id);

            if (ids.length === 0) {
              console.log('Nothing to prune.');
              return;
            }

            // Delete in batches of 1000
            const BATCH_SIZE = 1000;
            let deleted = 0;

            for (let i = 0; i < ids.length; i += BATCH_SIZE) {
              const batch = ids.slice(i, i + BATCH_SIZE);
              const result = await (db as any)
                .delete(auditLogs)
                .where(inArray(auditLogs.id, batch));
              deleted += result?.changes ?? batch.length;
            }

            console.log(`✅ Pruned ${deleted} audit log ${deleted === 1 ? 'entry' : 'entries'}.`);
          },
        }),
      },
    }),
  },
});
