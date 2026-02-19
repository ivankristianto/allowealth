import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { findLocalD1Path } from './d1-local';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('findLocalD1Path', () => {
  let tempDir: string;
  const D1_STATE_SUBDIR = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'd1-local-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true });
  });

  it('finds .sqlite file in wrangler state directory', () => {
    const stateDir = join(tempDir, D1_STATE_SUBDIR);
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, 'abcdef1234.sqlite'), '');

    const result = findLocalD1Path(tempDir);
    expect(result).toEndWith('abcdef1234.sqlite');
    expect(result).toContain(D1_STATE_SUBDIR);
  });

  it('returns first .sqlite file when multiple exist', () => {
    const stateDir = join(tempDir, D1_STATE_SUBDIR);
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, 'aaa.sqlite'), '');
    writeFileSync(join(stateDir, 'bbb.sqlite'), '');

    const result = findLocalD1Path(tempDir);
    // Should return one of them (first alphabetically from readdirSync)
    expect(result).toEndWith('.sqlite');
  });

  it('throws when state directory does not exist', () => {
    expect(() => findLocalD1Path(tempDir)).toThrow('Local D1 state directory not found');
  });

  it('throws when state directory is empty (no .sqlite files)', () => {
    const stateDir = join(tempDir, D1_STATE_SUBDIR);
    mkdirSync(stateDir, { recursive: true });

    expect(() => findLocalD1Path(tempDir)).toThrow('No .sqlite files found');
  });

  it('ignores non-.sqlite files', () => {
    const stateDir = join(tempDir, D1_STATE_SUBDIR);
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, 'something.json'), '{}');
    writeFileSync(join(stateDir, 'data.sqlite'), '');

    const result = findLocalD1Path(tempDir);
    expect(result).toEndWith('data.sqlite');
  });
});
