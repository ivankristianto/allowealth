import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import * as dbModule from '@/db';
import { db, getDb, resetDb } from '@/db';

describe('SQLite connection', () => {
  test('getDb() and the db proxy share one long-lived handle', () => {
    const first = getDb();

    expect(getDb()).toBe(first);
    expect(db.$client).toBe(first.$client);
    expect(db.$client).toBe(getDb().$client);
  });

  test('waits up to 5000 ms on a locked database instead of failing with SQLITE_BUSY', () => {
    expect(getDb().$client.query('PRAGMA busy_timeout').get()).toEqual({ timeout: 5000 });
  });

  test('no middleware drops the connection between requests', () => {
    expect('prepareForRequest' in dbModule).toBe(false);
    expect(readFileSync('src/middleware/index.ts', 'utf8')).not.toContain("'./database'");
  });

  test('resetDb() closes the old handle and the next access opens a new one', () => {
    const old = getDb().$client;

    resetDb();

    expect(() => old.query('SELECT 1').get()).toThrow();
    expect(getDb().$client).not.toBe(old);
    expect(getDb().$client.query('PRAGMA busy_timeout').get()).toEqual({ timeout: 5000 });
  });
});
