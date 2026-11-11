import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

const componentSource = readFileSync('src/components/atoms/ThemeToggle.astro', 'utf8');
const clientSource = readFileSync('src/components/atoms/ThemeToggle.client.ts', 'utf8');

describe('ThemeToggle', () => {
  it('renders a dedicated theme toggle button and loads the client script', () => {
    expect(componentSource).toContain('data-theme-toggle');
    expect(componentSource).toContain('aria-label="Toggle dark mode"');
    expect(componentSource).toContain('<Moon');
    expect(componentSource).toContain('<Sun');
    expect(componentSource).toContain('<script src="./ThemeToggle.client.ts"></script>');
  });

  it('persists theme selection and updates aria labels in the client module', () => {
    expect(clientSource).toContain("const THEME_STORAGE_KEY = 'theme'");
    expect(clientSource).toContain("const THEME_ATTRIBUTE = 'data-theme'");
    expect(clientSource).toContain('localStorage.setItem(THEME_STORAGE_KEY, theme)');
    expect(clientSource).toContain(
      "theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
    );
  });

  it('guards against duplicate initialization and listens for system theme changes', () => {
    expect(clientSource).toContain("const INIT_ATTRIBUTE = 'data-theme-toggle-init'");
    expect(clientSource).toContain("if (toggle.getAttribute(INIT_ATTRIBUTE) === 'true') return;");
    expect(clientSource).toContain(
      "window.matchMedia('(prefers-color-scheme: dark)').addEventListener"
    );
    expect(clientSource).toContain(
      "document.addEventListener('astro:page-load', initThemeToggle);"
    );
  });
});
