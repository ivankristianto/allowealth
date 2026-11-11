/**
 * Bun loads .env before the test preload runs, so a checkout whose .env points
 * DATABASE_URL at real data must still never have that file opened by tests.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveTestDatabaseUrl } from '@/lib/test-helpers/test-database-url';

const REPO_ROOT = join(import.meta.dir, '..', '..');
const PRELOAD = join(REPO_ROOT, 'src', '__tests__', 'setup.ts');

describe('resolveTestDatabaseUrl', () => {
  test('ignores DATABASE_URL and defaults to db/.test.db', () => {
    expect(resolveTestDatabaseUrl({ DATABASE_URL: 'db/.dev.db' })).toBe('db/.test.db');
  });

  test('honors a TEST_DATABASE_URL whose file name contains .test', () => {
    expect(resolveTestDatabaseUrl({ TEST_DATABASE_URL: 'db/.test-integration.db' })).toBe(
      'db/.test-integration.db'
    );
  });

  for (const url of [
    'db/.dev.db',
    '/var/lib/allowealth/prod.db',
    '/tmp/.test/real.db',
    ':memory:',
  ]) {
    test(`refuses TEST_DATABASE_URL=${url}`, () => {
      expect(() => resolveTestDatabaseUrl({ TEST_DATABASE_URL: url })).toThrow(
        'Refusing to run tests'
      );
    });
  }
});

describe('test preload', () => {
  let sandbox = '';

  // The preload migrates from drizzle/sqlite under the cwd, so the sandbox gets a copy
  beforeEach(() => {
    sandbox = mkdtempSync(join(tmpdir(), 'aw-preload-'));
    cpSync(join(REPO_ROOT, 'drizzle', 'sqlite'), join(sandbox, 'drizzle', 'sqlite'), {
      recursive: true,
    });
    writeFileSync(join(sandbox, '.env'), 'DATABASE_URL=db/.dev.db\n');
  });

  afterEach(() => {
    rmSync(sandbox, { recursive: true, force: true });
  });

  function runPreload(extraEnv: Record<string, string> = {}) {
    const env: Record<string, string | undefined> = { ...process.env, ...extraEnv };
    delete env.DATABASE_URL;
    if (!('TEST_DATABASE_URL' in extraEnv)) delete env.TEST_DATABASE_URL;

    return Bun.spawnSync(
      ['bun', '--preload', PRELOAD, '-e', 'console.log(process.env.DATABASE_URL)'],
      { cwd: sandbox, env, stdout: 'pipe', stderr: 'pipe' }
    );
  }

  test('points DATABASE_URL at the test database when .env names db/.dev.db', () => {
    const result = runPreload();

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString().trim()).toBe('db/.test.db');
    expect(existsSync(join(sandbox, 'db', '.test.db'))).toBe(true);
    expect(existsSync(join(sandbox, 'db', '.dev.db'))).toBe(false);
  });

  test('refuses to start when TEST_DATABASE_URL is not a .test file', () => {
    const result = runPreload({ TEST_DATABASE_URL: 'db/prod.db' });

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain('Refusing to run tests against "db/prod.db"');
    expect(existsSync(join(sandbox, 'db', 'prod.db'))).toBe(false);
    expect(existsSync(join(sandbox, 'db', '.dev.db'))).toBe(false);
  });
});
