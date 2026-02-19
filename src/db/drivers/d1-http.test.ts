import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { readWranglerConfig } from './d1-http';
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
