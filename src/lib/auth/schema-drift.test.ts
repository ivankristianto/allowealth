import { afterEach, describe, expect, it } from 'bun:test';
import { getAuthTables } from 'better-auth/db';
import { getTableColumns, getTableName, isTable } from 'drizzle-orm';
import type { Table } from 'drizzle-orm';
import * as schema from '@/db/schema/sqlite';
import { setTestEnv } from '@/lib/env';

/**
 * Better Auth plugins add columns between minor releases. The Drizzle adapter
 * silently drops fields with no matching column, so a missing column turns an
 * UPDATE into `update "x" set  where ...` and fails at runtime (two-factor
 * sign-in broke this way after the 1.5 → 1.6 upgrade).
 */
function getSchemaColumnsByTable(): Map<string, Set<string>> {
  const columnsByTable = new Map<string, Set<string>>();

  for (const exported of Object.values(schema)) {
    if (!isTable(exported)) continue;
    const table = exported as Table;
    const columnNames = Object.values(getTableColumns(table)).map((column) => column.name);
    columnsByTable.set(getTableName(table), new Set(columnNames));
  }

  return columnsByTable;
}

afterEach(() => {
  setTestEnv(null);
});

describe('better-auth schema drift', () => {
  it('declares every table and column the configured Better Auth plugins require', async () => {
    setTestEnv({
      NODE_ENV: 'test',
      BETTER_AUTH_SECRET: 'test-better-auth-secret',
      GOOGLE_CLIENT_ID: 'test-google-client-id',
      GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
    });

    // Query string bypasses `mock.module('@/lib/auth/server')` from other test files.
    const { auth, resetAuthInstance } = await import(`./server?drift=${Date.now()}`);
    const authTables = getAuthTables(auth.options);
    resetAuthInstance();

    const columnsByTable = getSchemaColumnsByTable();
    const missing: string[] = [];

    for (const table of Object.values(authTables)) {
      const columns = columnsByTable.get(table.modelName);
      if (!columns) {
        missing.push(`${table.modelName} (table)`);
        continue;
      }

      for (const [fieldKey, field] of Object.entries(table.fields)) {
        const columnName = field.fieldName ?? fieldKey;
        if (!columns.has(columnName)) {
          missing.push(`${table.modelName}.${columnName}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });
});
