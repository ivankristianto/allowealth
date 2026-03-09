import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('BaseLayout SSR theme rendering', () => {
  it('renders monochrome SSR as light theme with a grayscale filter', () => {
    const source = readFileSync('src/layouts/BaseLayout.astro', 'utf8');

    expect(source).toContain(
      "const resolvedTheme = ssrTheme === 'monochrome' ? 'light' : ssrTheme;"
    );
    expect(source).toContain(
      "const ssrFilterStyle = ssrTheme === 'monochrome' ? 'filter: grayscale(100%)' : undefined;"
    );
    expect(source).toContain("data-theme={hasServerTheme ? resolvedTheme : 'light'}");
    expect(source).toContain('style={ssrFilterStyle}');
  });
});
