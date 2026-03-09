import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('ManageAppearancesForm component', () => {
  it('renders an appearances card with all theme options and client script', () => {
    const componentSource = readFileSync(
      'src/components/organisms/ManageAppearancesForm.astro',
      'utf8'
    );

    expect(componentSource).toContain('Appearances');
    expect(componentSource).toContain('data-current-theme={currentTheme}');
    expect(componentSource).toContain("value: 'system'");
    expect(componentSource).toContain("value: 'light'");
    expect(componentSource).toContain("value: 'dark'");
    expect(componentSource).toContain("value: 'monochrome'");
    expect(componentSource).toContain('<script src="./ManageAppearancesForm.client.ts"></script>');
  });
});
