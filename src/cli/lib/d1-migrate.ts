/* eslint-disable no-console -- CLI output is intentional */
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const D1_DATABASE_NAME = 'allowealth-db';
const SETUP_SQL_PATH = 'src/db/setup.sql';

const RESERVED_D1_TABLE_PREFIXES = ['_cf_'] as const;

type TableDependencies = Record<string, string[]>;

/**
 * Build env for wrangler subprocess.
 * Maps CLOUDFLARE_TOKEN (app's canonical name) to CLOUDFLARE_API_TOKEN (wrangler's expected name).
 */
function wranglerEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...(process.env.CLOUDFLARE_TOKEN && !process.env.CLOUDFLARE_API_TOKEN
      ? { CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_TOKEN }
      : {}),
  };
}

/**
 * Execute a SQL command against D1 via wrangler.
 */
function d1Execute(sql: string, local: boolean): string {
  const result = execFileSync(
    'wrangler',
    ['d1', 'execute', D1_DATABASE_NAME, local ? '--local' : '--remote', '--command', sql],
    { encoding: 'utf-8', env: wranglerEnv() }
  );
  return result;
}

/**
 * Execute a SQL command and return JSON output from D1.
 */
function d1ExecuteJson(sql: string, local: boolean): Record<string, unknown>[] {
  const result = execFileSync(
    'wrangler',
    ['d1', 'execute', D1_DATABASE_NAME, local ? '--local' : '--remote', '--command', sql, '--json'],
    { encoding: 'utf-8', env: wranglerEnv() }
  );
  const parsed = JSON.parse(result) as Array<{ results?: Record<string, unknown>[] }>;
  // wrangler d1 --json returns an array of result sets
  return parsed[0]?.results ?? [];
}

/**
 * Get list of all user tables in D1 (excludes system tables).
 */
function getAllTables(local: boolean): string[] {
  const rows = d1ExecuteJson(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;",
    local
  );
  return rows.map((row) => row.name as string);
}

/**
 * Filter to user-managed tables that are safe to drop.
 */
export function filterDroppableTables(tables: string[]): string[] {
  return tables.filter(
    (tableName) => !RESERVED_D1_TABLE_PREFIXES.some((prefix) => tableName.startsWith(prefix))
  );
}

/**
 * Order tables so children are dropped before parents.
 * Edge direction: table -> referenced parent tables.
 */
export function orderTablesForDrop(tables: string[], dependencies: TableDependencies): string[] {
  const tableSet = new Set(tables);
  const inDegree = new Map<string, number>();
  const edges = new Map<string, string[]>();

  for (const tableName of tables) {
    inDegree.set(tableName, 0);
    const parents = Array.from(
      new Set((dependencies[tableName] ?? []).filter((parent) => parent !== tableName))
    ).filter((parent) => tableSet.has(parent));
    edges.set(tableName, parents);
  }

  for (const parents of edges.values()) {
    for (const parent of parents) {
      inDegree.set(parent, (inDegree.get(parent) ?? 0) + 1);
    }
  }

  const queue = tables.filter((tableName) => (inDegree.get(tableName) ?? 0) === 0).sort();
  const ordered: string[] = [];

  while (queue.length > 0) {
    const tableName = queue.shift() as string;
    ordered.push(tableName);

    for (const parent of edges.get(tableName) ?? []) {
      const nextDegree = (inDegree.get(parent) ?? 0) - 1;
      inDegree.set(parent, nextDegree);
      if (nextDegree === 0) {
        queue.push(parent);
        queue.sort();
      }
    }
  }

  // Fallback for cycles: append unresolved tables deterministically.
  if (ordered.length !== tables.length) {
    const unresolved = tables.filter((tableName) => !ordered.includes(tableName)).sort();
    return [...ordered, ...unresolved];
  }

  return ordered;
}

function getForeignKeyParents(tableName: string, local: boolean): string[] {
  const safeName = tableName.replace(/`/g, '``');
  const rows = d1ExecuteJson(`PRAGMA foreign_key_list(\`${safeName}\`);`, local);
  return rows.map((row) => row.table as string);
}

/**
 * Drop all tables from D1 database.
 */
export async function dropD1Tables(options: { local: boolean }): Promise<void> {
  const { local } = options;
  const target = local ? 'local' : 'remote';

  console.log(`\n🗑️  Dropping all D1 tables (${target})`);
  console.log('='.repeat(40));

  const tables = getAllTables(local);

  const userTables = filterDroppableTables(tables);
  const userTableSet = new Set(userTables);
  const dependencies: TableDependencies = {};

  for (const tableName of userTables) {
    dependencies[tableName] = getForeignKeyParents(tableName, local).filter((parent) =>
      userTableSet.has(parent)
    );
  }
  const orderedTables = orderTablesForDrop(userTables, dependencies);

  if (userTables.length === 0) {
    console.log('No tables to drop.');
  } else {
    console.log(`Found ${userTables.length} table(s) to drop:\n`);

    // D1 enforces foreign keys, so drop child tables before parents.
    for (const tableName of orderedTables) {
      const safeName = tableName.replace(/`/g, '``');
      d1Execute(`DROP TABLE IF EXISTS \`${safeName}\`;`, local);
      console.log(`  ✓ Dropped: ${tableName}`);
    }
  }

  console.log(`\n✅ Dropped ${userTables.length} table(s).`);
}

/**
 * Setup D1 database using the consolidated setup.sql file.
 */
export async function setupD1(options: { local: boolean }): Promise<void> {
  const { local } = options;
  const target = local ? 'local' : 'remote';

  console.log(`\n🔧 Setting up D1 database (${target})`);
  console.log('='.repeat(40));

  const setupSqlPath = resolve(SETUP_SQL_PATH);
  console.log(`Executing: ${setupSqlPath}`);

  execFileSync(
    'wrangler',
    ['d1', 'execute', D1_DATABASE_NAME, local ? '--local' : '--remote', '--file', setupSqlPath],
    { encoding: 'utf-8', env: wranglerEnv(), stdio: 'inherit' }
  );

  console.log(`\n✅ D1 database setup complete.`);
}
