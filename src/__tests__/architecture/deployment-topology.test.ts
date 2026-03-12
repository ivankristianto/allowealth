import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, test } from 'bun:test';

function rgOutput(args: string[]): string {
  try {
    return execFileSync('rg', args, { encoding: 'utf-8' }).trim();
  } catch (error) {
    const result = error as { stdout?: string };
    return result.stdout?.trim() ?? '';
  }
}

describe('deployment topology', () => {
  test('uses apps/docs and apps/site deployment surfaces', () => {
    expect(existsSync('apps/docs/wrangler.toml')).toBe(true);
    expect(existsSync('apps/site/wrangler.toml')).toBe(true);
    expect(existsSync('docs/sites')).toBe(false);
  });

  test('docs scripts and workflow target apps/docs', () => {
    const pkg = readFileSync('package.json', 'utf-8');
    const workflow = readFileSync('.github/workflows/deploy-docs-site.yml', 'utf-8');

    expect(pkg).toContain('--cwd apps/docs');
    expect(workflow).toContain("paths:\n      - 'apps/docs/**'");
    expect(workflow).toContain('workingDirectory: apps/docs');
  });

  test('non-historical source files no longer reference docs/sites', () => {
    const references = rgOutput([
      '-n',
      'docs/sites',
      '.',
      '-g',
      '!docs/plans/**',
      '-g',
      '!src/__tests__/architecture/deployment-topology.test.ts',
    ]);
    expect(references).toBe('');
  });
});
