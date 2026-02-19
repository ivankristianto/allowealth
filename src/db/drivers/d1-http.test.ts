import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { readWranglerConfig, mapD1Result } from './d1-http';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('readWranglerConfig', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'd1-http-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true });
  });

  it('parses account_id and database_id from wrangler.toml', () => {
    writeFileSync(
      join(tempDir, 'wrangler.toml'),
      `account_id = "abc123"\nname = "my-app"\n\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "my-db"\ndatabase_id = "def456"\n`
    );

    const config = readWranglerConfig(tempDir);
    expect(config.accountId).toBe('abc123');
    expect(config.databaseId).toBe('def456');
  });

  it('handles extra whitespace around equals sign', () => {
    writeFileSync(
      join(tempDir, 'wrangler.toml'),
      `account_id  =  "spaced-id"\n\n[[d1_databases]]\ndatabase_id  =  "spaced-db-id"\n`
    );

    const config = readWranglerConfig(tempDir);
    expect(config.accountId).toBe('spaced-id');
    expect(config.databaseId).toBe('spaced-db-id');
  });

  it('throws when account_id is missing', () => {
    writeFileSync(
      join(tempDir, 'wrangler.toml'),
      `name = "my-app"\n\n[[d1_databases]]\ndatabase_id = "def456"\n`
    );

    expect(() => readWranglerConfig(tempDir)).toThrow('account_id not found');
  });

  it('throws when database_id is missing', () => {
    writeFileSync(join(tempDir, 'wrangler.toml'), `account_id = "abc123"\nname = "my-app"\n`);

    expect(() => readWranglerConfig(tempDir)).toThrow('database_id not found');
  });

  it('throws when wrangler.toml does not exist', () => {
    expect(() => readWranglerConfig(join(tempDir, 'nonexistent'))).toThrow();
  });

  it('ignores commented-out database_id lines', () => {
    writeFileSync(
      join(tempDir, 'wrangler.toml'),
      `account_id = "abc123"\n# database_id = "commented-out"\n\n[[d1_databases]]\ndatabase_id = "real-id"\n`
    );

    const config = readWranglerConfig(tempDir);
    expect(config.databaseId).toBe('real-id');
  });
});

describe('mapD1Result', () => {
  const sampleRows = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ];

  it('returns empty rows for "run" method', () => {
    expect(mapD1Result(sampleRows, 'run')).toEqual({ rows: [] });
  });

  it('returns empty rows for "run" with empty input', () => {
    expect(mapD1Result([], 'run')).toEqual({ rows: [] });
  });

  it('returns positional array for "get" method', () => {
    const result = mapD1Result(sampleRows, 'get');
    expect(result).toEqual({ rows: [1, 'Alice', 'alice@example.com'] });
  });

  it('returns empty rows for "get" with no results', () => {
    const result = mapD1Result([], 'get');
    expect(result).toEqual({ rows: [] });
  });

  it('returns array of positional arrays for "all" method', () => {
    const result = mapD1Result(sampleRows, 'all');
    expect(result).toEqual({
      rows: [
        [1, 'Alice', 'alice@example.com'],
        [2, 'Bob', 'bob@example.com'],
      ],
    });
  });

  it('returns empty rows for "all" with no results', () => {
    expect(mapD1Result([], 'all')).toEqual({ rows: [] });
  });

  it('returns array of positional arrays for "values" method', () => {
    const result = mapD1Result(sampleRows, 'values');
    expect(result).toEqual({
      rows: [
        [1, 'Alice', 'alice@example.com'],
        [2, 'Bob', 'bob@example.com'],
      ],
    });
  });

  it('handles rows with null values', () => {
    const rows = [{ id: 1, name: null, email: 'a@b.com' }];
    expect(mapD1Result(rows, 'get')).toEqual({ rows: [1, null, 'a@b.com'] });
  });

  it('handles single-column results', () => {
    const rows = [{ count: 42 }];
    expect(mapD1Result(rows, 'get')).toEqual({ rows: [42] });
    expect(mapD1Result(rows, 'all')).toEqual({ rows: [[42]] });
  });
});
