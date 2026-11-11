import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function readSourceIfExists(relativePath: string): string {
  const sourcePath = fileURLToPath(new URL(relativePath, import.meta.url));
  return existsSync(sourcePath) ? readFileSync(sourcePath, 'utf-8') : '';
}

const source = readSourceIfExists('./ForecastTable.astro');

describe('ForecastTable component', () => {
  it('exposes the full recurring name when the visible label is truncated', () => {
    expect(source).toMatch(/<span\s+title=\{row\.templateName\}/);
  });

  it('includes a right-edge scroll fade overlay with a data attribute for JS control', () => {
    expect(source).toMatch(/data-scroll-fade/);
  });

  it('includes a client script that hides the overlay when fully scrolled', () => {
    expect(source).toMatch(/scrollLeft\s*\+\s*clientWidth/);
    expect(source).toContain('data-scrolled-end');
  });
});
