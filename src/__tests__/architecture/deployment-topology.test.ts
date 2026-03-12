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
    expect(existsSync('apps/site/public/_headers')).toBe(true);
    expect(existsSync('apps/site/src/__tests__/routes.test.ts')).toBe(true);
    expect(existsSync('apps/site/src/pages/index.astro')).toBe(true);
    expect(existsSync('apps/site/src/pages/terms.astro')).toBe(true);
    expect(existsSync('apps/site/src/pages/privacy.astro')).toBe(true);
    expect(existsSync('src/pages/index.astro')).toBe(false);
    expect(existsSync('src/pages/terms.astro')).toBe(false);
    expect(existsSync('src/pages/privacy.astro')).toBe(false);
    expect(existsSync('.github/workflows/deploy-site.yml')).toBe(true);
    expect(existsSync('docs/sites')).toBe(false);
  });

  test('docs scripts and workflow target apps/docs', () => {
    const pkg = readFileSync('package.json', 'utf-8');
    const workflow = readFileSync('.github/workflows/deploy-docs-site.yml', 'utf-8');

    expect(pkg).toContain('--cwd apps/docs');
    expect(workflow).toContain("paths:\n      - 'apps/docs/**'");
    expect(workflow).toContain('workingDirectory: apps/docs');
  });

  test('worker example and site workflow document the split topology', () => {
    const wranglerExample = readFileSync('wrangler.toml.example', 'utf-8');
    const siteWorkflow = readFileSync('.github/workflows/deploy-site.yml', 'utf-8');

    expect(wranglerExample).toContain('YOUR_WORKER_NAME');
    expect(wranglerExample).toContain('PUBLIC_SITE_URL');
    expect(wranglerExample).not.toContain('APP_MODE');
    expect(siteWorkflow).toContain("paths:\n      - 'apps/site/**'");
    expect(siteWorkflow).toContain('workingDirectory: apps/site');
    expect(siteWorkflow).toContain('command: pages deploy');
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
