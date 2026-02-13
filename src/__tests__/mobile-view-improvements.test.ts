import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();
const read = (path: string) => readFileSync(join(projectRoot, path), 'utf8');

describe('mobile view improvements', () => {
  it('moves asset month controls to header slot and uses selected month as subtitle', () => {
    const content = read('src/pages/assets/index.astro');

    expect(content).toContain('subtitle={currentMonthDisplay}');
    expect(content).toContain('slot="header"');
    expect(content).not.toContain('AssetPageHeader');
  });

  it('moves report selector to header slot and uses selected period as subtitle', () => {
    const content = read('src/pages/reports/index.astro');

    expect(content).toContain('subtitle={selectedPeriodLabel}');
    expect(content).toContain('slot="header"');
    expect(content).not.toContain('Spending Insights');
  });

  it('deprecates AssetPageHeader component file', () => {
    const componentPath = join(projectRoot, 'src/components/molecules/AssetPageHeader.astro');
    expect(existsSync(componentPath)).toBe(false);
  });
});
