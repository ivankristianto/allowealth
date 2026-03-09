import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('authenticated theme toggle removal', () => {
  it('removes ThemeToggle from authenticated layouts and keeps it in PublicLayout', () => {
    const headerSource = readFileSync('src/components/layouts/Header.astro', 'utf8');
    const mainLayoutSource = readFileSync('src/layouts/MainLayout.astro', 'utf8');
    const publicLayoutSource = readFileSync('src/layouts/PublicLayout.astro', 'utf8');

    expect(headerSource).not.toContain("import ThemeToggle from '../atoms/ThemeToggle.astro';");
    expect(headerSource).not.toContain('<ThemeToggle size="sm" className="lg:hidden" />');

    expect(mainLayoutSource).not.toContain(
      "import ThemeToggle from '../components/atoms/ThemeToggle.astro';"
    );
    expect(mainLayoutSource).not.toContain(
      '<ThemeToggle className="hidden lg:block fixed bottom-6 right-6 z-40" />'
    );

    expect(publicLayoutSource).toContain(
      "import ThemeToggle from '@/components/atoms/ThemeToggle.astro';"
    );
    expect(publicLayoutSource).toContain('<ThemeToggle className="fixed bottom-6 right-6 z-50" />');
  });
});
