import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function readSourceIfExists(relativePath: string): string {
  const sourcePath = fileURLToPath(new URL(relativePath, import.meta.url));
  return existsSync(sourcePath) ? readFileSync(sourcePath, 'utf-8') : '';
}

const source = readSourceIfExists('./DemoBanner.astro');

describe('DemoBanner component', () => {
  it('checks demo mode at render time and returns nothing when disabled', () => {
    expect(source).toContain("import { isDemoMode } from '@/lib/demo-mode';");
    expect(source).toContain('if (!isDemoMode()) return;');
  });

  it('renders the warning alert copy for demo environments', () => {
    expect(source).toContain('alert alert-warning');
    expect(source).toContain('This is a demo environment. All data resets daily.');
  });
});
