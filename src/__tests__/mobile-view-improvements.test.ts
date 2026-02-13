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

  it('enforces edge-bleed mobile action rows for all ActionBar consumers', () => {
    const actionBar = read('src/components/molecules/ActionBar.astro');
    expect(actionBar).toContain('overflow-x-auto');
    expect(actionBar).toContain('overflow-y-hidden');
    expect(actionBar).toContain('md:overflow-visible');
    expect(actionBar).toContain('md:mx-0');

    const consumers = [
      read('src/components/molecules/TransactionActionsBar.astro'),
      read('src/components/molecules/BudgetActions.astro'),
      read('src/components/organisms/AssetActions.astro'),
    ];

    consumers.forEach((content) => {
      expect(content).toContain('edgeBleed');
    });
  });

  it('uses ActionBar edge-bleed action rows in asset and budget category pages', () => {
    const assetCategoriesPage = read('src/pages/assets/categories/index.astro');
    const budgetCategoriesPage = read('src/pages/budget/categories/index.astro');

    expect(assetCategoriesPage).toContain(
      "import ActionBar from '@components/molecules/ActionBar.astro'"
    );
    expect(assetCategoriesPage).toContain('ariaLabel="Asset category actions"');
    expect(assetCategoriesPage).toContain('edgeBleed');

    expect(budgetCategoriesPage).toContain(
      "import ActionBar from '@components/molecules/ActionBar.astro'"
    );
    expect(budgetCategoriesPage).toContain('ariaLabel="Budget category actions"');
    expect(budgetCategoriesPage).toContain('edgeBleed');
  });

  it('allows horizontal scrolling for header slot controls on mobile', () => {
    const header = read('src/components/layouts/Header.astro');
    expect(header).toContain('data-header-slot-mobile');
    expect(header).toContain('justify-start');
    expect(header).toContain('flex-wrap');
  });

  it('renders header slot directly instead of injecting HTML strings', () => {
    const header = read('src/components/layouts/Header.astro');
    expect(header).toContain('<slot name="header" />');
    expect(header).not.toContain('Astro.slots.render(');
    expect(header).not.toContain('set:html={headerSlotHtml}');
  });

  it('forwards header slot in MainLayout without set:html injection', () => {
    const mainLayout = read('src/layouts/MainLayout.astro');

    expect(mainLayout).toContain('<slot name="header" slot="header" />');
    expect(mainLayout).not.toContain("Astro.slots.render('header')");
    expect(mainLayout).not.toContain('set:html={headerSlotHtml}');
  });

  it('keeps reports selector container in header slot for client re-rendering', () => {
    const reports = read('src/pages/reports/index.astro');
    expect(reports).toContain('slot="header"');
    expect(reports).toContain('data-selector-container');
  });

  it('does not clip period dropdown menus with overflow-y-hidden wrappers', () => {
    const header = read('src/components/layouts/Header.astro');
    const reportSelector = read('src/components/molecules/ReportSelector.astro');
    const budgetHeaderControls = read('src/components/molecules/BudgetHeaderControls.astro');

    expect(header).not.toContain('overflow-y-hidden');
    expect(header).not.toContain('overflow-x-auto');
    expect(reportSelector).not.toContain('overflow-y-hidden');
    expect(reportSelector).not.toContain('overflow-x-auto');
    expect(budgetHeaderControls).not.toContain('overflow-y-hidden');
    expect(budgetHeaderControls).not.toContain('overflow-x-auto');
  });
});
