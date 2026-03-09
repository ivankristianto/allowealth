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
      /class="sticky left-0 z-30 [^"]*w-72[^"]*min-w-72[^"]*max-w-72[^"]*overflow-hidden/
    );
    expect(source).toMatch(
      /class="sticky left-0 z-10 [^"]*w-72[^"]*min-w-72[^"]*max-w-72[^"]*overflow-hidden/
    );
    expect(source).toContain('class="flex min-w-0 items-start gap-2.5"');
    expect(source).toContain(
      'class="block min-w-0 flex-1 truncate text-sm font-bold text-base-content"'
    );
  });

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

  it('uses opaque sticky surfaces so scrolled values do not bleed under the recurring column', () => {
    expect(source).not.toContain('bg-base-200/50');
    expect(source).not.toContain('group-hover:bg-base-200/30');
    expect(source).toContain('border-r border-base-300 bg-base-200');
  });

  it('shows schedule frequency as meta information in the recurring column', () => {
    expect(source).not.toMatch(/>Freq\.<\/th>/);
    expect(source).toMatch(/>\s*Recurring\s*<\/th>/);
    expect(source).toContain('{row.frequencyLabel}');
  });
});
