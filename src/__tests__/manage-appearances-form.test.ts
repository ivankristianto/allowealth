import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('ManageAppearancesForm component', () => {
  it('renders a theme card with all theme options and the selected-state badge', () => {
    const componentSource = readFileSync(
      'src/components/organisms/ManageAppearancesForm.astro',
      'utf8'
    );

    expect(componentSource).toContain("import { Palette, Check } from '@lucide/astro';");
    expect(componentSource).toContain('Theme');
    expect(componentSource).toContain('Display preference');
    expect(componentSource).toContain('data-current-theme={currentTheme}');
    expect(componentSource).toContain("value: 'system'");
    expect(componentSource).toContain("value: 'light'");
    expect(componentSource).toContain("value: 'dark'");
    expect(componentSource).toContain("value: 'monochrome'");
    expect(componentSource).toContain('peer-checked:flex');
    expect(componentSource).not.toContain('Choose your theme');
    expect(componentSource).toContain('<script src="./ManageAppearancesForm.client.ts"></script>');
  });
});
