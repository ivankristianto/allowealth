import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { is, SQL } from 'drizzle-orm';
import { getTableConfig, SQLiteSyncDialect, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runSqliteMigrations } from './migrate';
import { budgets } from './schema/sqlite';

const SCHEMA_DIR = join(process.cwd(), 'src/db/schema/sqlite');
const MIGRATIONS_DIR = join(process.cwd(), 'drizzle/sqlite');
const MS_THRESHOLD = 100_000_000_000;

interface TimestampColumn {
  table: string;
  column: string;
  mode: 'timestamp' | 'timestamp_ms';
  sqlDefault: SQL | undefined;
  hasDefaultFn: boolean;
}

// Reads every schema file, not just the barrel, because some tables are not re-exported from it.
async function collectTimestampColumns(): Promise<TimestampColumn[]> {
  const files = readdirSync(SCHEMA_DIR).filter(
    (file) => file.endsWith('.ts') && !file.endsWith('.test.ts')
  );
  const columns = new Map<string, TimestampColumn>();
  for (const file of files) {
    const module = (await import(join(SCHEMA_DIR, file))) as Record<string, unknown>;
    for (const value of Object.values(module)) {
      if (!is(value, SQLiteTable)) continue;
      const config = getTableConfig(value);
      for (const column of config.columns) {
        if (column.columnType !== 'SQLiteTimestamp') continue;
        const mode = (column as unknown as { mode: TimestampColumn['mode'] }).mode;
        columns.set(`${config.name}.${column.name}`, {
          table: config.name,
          column: column.name,
          mode,
          sqlDefault: is(column.default, SQL) ? column.default : undefined,
          hasDefaultFn: typeof column.defaultFn === 'function',
        });
      }
    }
  }
  return [...columns.values()];
}

function repairMigrationFile(): string {
  const file = readdirSync(MIGRATIONS_DIR).find((name) =>
    name.endsWith('_repair_ms_timestamps.sql')
  );
  if (!file) throw new Error('repair_ms_timestamps migration not found');
  return file;
}

function readRepairMigration(): string {
  return readFileSync(join(MIGRATIONS_DIR, repairMigrationFile()), 'utf8');
}

// Tables created by later migrations never held the ms default, and the repair runs before they exist.
function tablesAtRepairMigration(): Set<string> {
  const index = repairMigrationFile().split('_')[0];
  const snapshot = JSON.parse(
    readFileSync(join(MIGRATIONS_DIR, 'meta', `${index}_snapshot.json`), 'utf8')
  ) as { tables: Record<string, unknown> };
  return new Set(Object.keys(snapshot.tables));
}

function runStatements(db: Database, sql: string): void {
  for (const statement of sql.split('--> statement-breakpoint')) {
    const body = statement.replace(/--[^\n]*/g, '').trim();
    if (body) db.run(body);
  }
}

describe('timestamp defaults', () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'allowealth-timestamps-'));
    dbPath = join(tempDir, 'timestamps.db');
    runSqliteMigrations(dbPath);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('stores seconds when a budget is inserted without created_at or updated_at', () => {
    const raw = new Database(dbPath);
    try {
      raw.run('PRAGMA foreign_keys = OFF');
      const db = drizzle(raw);
      db.insert(budgets)
        .values({
          id: 'budget-default-ts',
          workspace_id: 'ws',
          created_by_user_id: 'user',
          category_id: 'cat',
          month: 1,
          year: 2026,
          budget_amount: '100',
          currency: 'USD',
        })
        .run();

      const nowSeconds = Math.floor(Date.now() / 1000);
      const stored = raw
        .query('SELECT created_at, updated_at FROM budgets WHERE id = ?')
        .get('budget-default-ts') as { created_at: number; updated_at: number };
      expect(Math.abs(stored.created_at - nowSeconds)).toBeLessThanOrEqual(5);
      expect(Math.abs(stored.updated_at - nowSeconds)).toBeLessThanOrEqual(5);

      const [row] = db.select().from(budgets).all();
      expect(Math.abs(row.created_at.getTime() - Date.now())).toBeLessThan(5000);
    } finally {
      raw.close();
    }
  });

  it('never gives a seconds column a SQL default that evaluates to milliseconds', async () => {
    const dialect = new SQLiteSyncDialect();
    const probe = new Database(':memory:');
    try {
      const offenders = (await collectTimestampColumns())
        .filter((column) => column.mode === 'timestamp' && column.sqlDefault)
        .filter((column) => {
          const expression = dialect.sqlToQuery(column.sqlDefault as SQL).sql;
          const { value } = probe.query(`SELECT ${expression} AS value`).get() as { value: number };
          return value > MS_THRESHOLD;
        })
        .map((column) => `${column.table}.${column.column}`);
      expect(offenders).toEqual([]);
    } finally {
      probe.close();
    }
  });

  it('gives every seconds created_at and updated_at column a $defaultFn', async () => {
    const missing = (await collectTimestampColumns())
      .filter(
        (column) =>
          column.mode === 'timestamp' &&
          /^(created|updated)_?at$/i.test(column.column) &&
          !column.hasDefaultFn
      )
      .map((column) => `${column.table}.${column.column}`);

    expect(missing).toEqual([]);
  });

  it('repairs exactly the seconds columns, and nothing else', async () => {
    const columns = await collectTimestampColumns();
    const repairedTables = tablesAtRepairMigration();
    const expected = columns
      .filter((column) => column.mode === 'timestamp' && repairedTables.has(column.table))
      .map((column) => `${column.table}.${column.column}`)
      .sort();
    const repaired = [
      ...readRepairMigration().matchAll(
        /UPDATE `([^`]+)` SET `([^`]+)` = `\2` \/ 1000 WHERE `\2` > 100000000000;/g
      ),
    ]
      .map(([, table, column]) => `${table}.${column}`)
      .sort();

    expect(repaired).toEqual(expected);
    expect(repaired).not.toContain('audit_logs.created_at');
  });

  it('converts ms rows to seconds, leaves seconds rows alone, and is idempotent', () => {
    const msValue = 1_794_000_000_123;
    const secondsValue = 1_700_000_000;
    const raw = new Database(dbPath);
    try {
      raw.run('PRAGMA foreign_keys = OFF');
      const insertBudget = raw.prepare(
        `INSERT INTO budgets (id, workspace_id, created_by_user_id, category_id, month, year,
           budget_amount, currency, created_at, updated_at)
         VALUES (?, 'ws', 'user', 'cat', ?, 2026, '100', 'USD', ?, ?)`
      );
      insertBudget.run('ms-row', 1, msValue, msValue);
      insertBudget.run('seconds-row', 2, secondsValue, secondsValue);
      raw.run(
        `INSERT INTO audit_logs (id, workspace_id, user_id, action, entity_type, created_at)
         VALUES ('audit-row', 'ws', 'user', 'test', 'budget', ?)`,
        [msValue]
      );

      const repair = readRepairMigration();
      runStatements(raw, repair);
      runStatements(raw, repair);

      const budgetRows = raw
        .query('SELECT id, created_at, updated_at FROM budgets ORDER BY id')
        .all() as Array<{ id: string; created_at: number; updated_at: number }>;
      expect(budgetRows).toEqual([
        {
          id: 'ms-row',
          created_at: Math.floor(msValue / 1000),
          updated_at: Math.floor(msValue / 1000),
        },
        { id: 'seconds-row', created_at: secondsValue, updated_at: secondsValue },
      ]);

      const audit = raw.query("SELECT created_at FROM audit_logs WHERE id = 'audit-row'").get() as {
        created_at: number;
      };
      expect(audit.created_at).toBe(msValue);
    } finally {
      raw.close();
    }
  });
});
