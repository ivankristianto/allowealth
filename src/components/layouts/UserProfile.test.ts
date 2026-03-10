import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('UserProfile layout', () => {
  it('renders a theme quick-switcher inside the dropdown menu', () => {
    const source = readFileSync('src/components/layouts/UserProfile.astro', 'utf8');

    expect(source).toContain(
      "import { User, Shield, LogOut, ChevronDown, Sun, Moon, Monitor, Contrast } from '@lucide/astro';"
    );
    expect(source).toContain('data-theme-switcher');
    expect(source).toContain("label: 'System'");
    expect(source).toContain("label: 'Light'");
    expect(source).toContain("label: 'Dark'");
    expect(source).toContain("label: 'Mono'");
    expect(source).toContain("import { addToast } from '@/lib/stores/toastStore';");
    expect(source).toContain("import { addToast } from '@/lib/stores/toastStore';");
    expect(source).toContain('type Theme,');
    expect(source).toContain('applyThemeToDom,');
    expect(source).toContain('getCurrentTheme,');
    expect(source).toContain('saveTheme,');
    expect(source).toContain("} from '@/lib/utils/theme-client';");
    expect(source).toContain('THEME_CHANGE_EVENT');
    expect(source).toContain("switcher.dataset.themeSwitcherBound === 'true'");
    expect(source).toContain('let themeSaveController: AbortController | null = null;');
    expect(source).toContain('let themeSaveRequestVersion = 0;');
    expect(source).toContain('document.addEventListener(');
    expect(source).toContain(
      'const activeTheme = (event as CustomEvent<{ theme: Theme }>).detail.theme;'
    );
    expect(source).toContain('highlightActiveTheme(switcher, activeTheme);');
    expect(source).toContain('form.dataset.currentTheme = activeTheme;');
    expect(source).toContain('radio.checked = radio.value === activeTheme;');
    expect(source).toContain('themeSaveController?.abort();');
    expect(source).toContain('themeSaveController = new AbortController();');
    expect(source).toContain('const requestVersion = ++themeSaveRequestVersion;');
    expect(source).toContain('await saveTheme(theme, themeSaveController.signal);');
    expect(source).toContain("error instanceof Error && error.name === 'AbortError'");
    expect(source).toContain('if (requestVersion !== themeSaveRequestVersion) return;');
    expect(source).not.toContain('text-[10px]');
  });
});
