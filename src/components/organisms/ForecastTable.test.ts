import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function readSourceIfExists(relativePath: string): string {
  const sourcePath = fileURLToPath(new URL(relativePath, import.meta.url));
  return existsSync(sourcePath) ? readFileSync(sourcePath, 'utf-8') : '';
}

const source = readSourceIfExists('./ForecastTable.astro');

describe('ForecastTable component', () => {
  it('keeps the sticky recurring column clipped above horizontally scrolled values', () => {
    expect(source).toMatch(
      /class="sticky left-0 z-30 [^"]*w-80[^"]*min-w-80[^"]*max-w-80[^"]*overflow-hidden/
    );
    expect(source).toMatch(
      /class="sticky left-0 z-10 [^"]*w-80[^"]*min-w-80[^"]*max-w-80[^"]*overflow-hidden/
    );
    expect(source).toContain('class="flex min-w-0 items-center gap-2"');
    expect(source).toContain(
      'class="block min-w-0 flex-1 truncate text-sm font-bold text-base-content"'
    );
  });

  it('exposes the full recurring name when the visible label is truncated', () => {
    expect(source).toMatch(/<span\s+title=\{row\.templateName\}/);
  });
});
