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

  it('uses PeriodicSelector for asset header month controls', () => {
    const assetsPage = read('src/pages/assets/index.astro');

    expect(assetsPage).toContain(
      "import PeriodicSelector, { type PeriodOption } from '@/components/molecules/PeriodicSelector.astro'"
    );
    expect(assetsPage).toContain('<PeriodicSelector');
    expect(assetsPage).toContain('data-asset-header-controls');
  });

  it('uses configurable month window and full month-year labels for assets periods', () => {
    const assetsPage = read('src/pages/assets/index.astro');

    expect(assetsPage).toContain(
      "import { PERIOD_SELECTOR_MONTH_LIMIT } from '@/lib/constants/period'"
    );
    expect(assetsPage).toContain("import { formatMonthYear } from '@/lib/utils/date'");
    expect(assetsPage).toContain('length: PERIOD_SELECTOR_MONTH_LIMIT');
    expect(assetsPage).toContain('label: formatMonthYear(date)');
    expect(assetsPage).not.toContain("month: 'short'");
  });

  it('moves report selector to header slot and uses selected period as subtitle', () => {
    const content = read('src/pages/reports/index.astro');

    expect(content).toContain('subtitle={selectedPeriodLabel}');
    expect(content).toContain('slot="header"');
    expect(content).not.toContain('Spending Insights');
  });

  it('uses latest-first monthly periods (max 12) for reports selectors', () => {
    const reportsPage = read('src/pages/reports/index.astro');
    const reportsApi = read('src/pages/api/reports/index.ts');

    expect(reportsPage).toContain('Array.from({ length: 12 }');
    expect(reportsPage).toContain('const monthsBack = i;');
    expect(reportsPage).toContain('? monthlyPeriods[0].key');

    expect(reportsApi).toContain('Array.from({ length: 12 }');
    expect(reportsApi).toContain('const monthsBack = i;');
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

  it('keeps reports selector controls in a single row on mobile', () => {
    const reportSelector = read('src/components/molecules/ReportSelector.astro');

    expect(reportSelector).toContain('flex-nowrap');
    expect(reportSelector).not.toContain('flex-wrap');
  });

  it('uses compact mobile PeriodicSelector controls for reports period navigation', () => {
    const reportSelector = read('src/components/molecules/ReportSelector.astro');
    const periodNavigator = read('src/components/molecules/PeriodNavigator.astro');

    expect(reportSelector).toContain('compactMobile');
    expect(periodNavigator).toContain('compactMobile');
    expect(periodNavigator).toContain('btn-sm');
    expect(periodNavigator).toContain('min-w-[96px]');
  });

  it('uses descending month navigation for reports and full month-year labels', () => {
    const reportSelector = read('src/components/molecules/ReportSelector.astro');
    const periodNavigator = read('src/components/molecules/PeriodNavigator.astro');
    const periodNavigatorClient = read('src/components/molecules/PeriodNavigator.client.ts');
    const reportsPage = read('src/pages/reports/index.astro');
    const reportsApi = read('src/pages/api/reports/index.ts');

    expect(reportSelector).toContain('newestFirst');
    expect(periodNavigator).toContain('newestFirst');
    expect(periodNavigatorClient).toContain('data-newest-first');
    expect(periodNavigatorClient).toContain('prevIndexAt');
    expect(periodNavigatorClient).toContain('newestFirst ? index + 1 : index - 1');

    expect(reportsPage).toContain('formatMonthYear');
    expect(reportsApi).toContain('formatMonthYear');
    expect(reportsPage).not.toContain('MONTH_NAMES_SHORT');
    expect(reportsApi).not.toContain('MONTH_NAMES_SHORT');
  });

  it('uses configurable month window for budget period options', () => {
    const budgetPeriodUtil = read('src/lib/utils/budget-period.ts');

    expect(budgetPeriodUtil).toContain(
      "import { PERIOD_SELECTOR_MONTH_LIMIT } from '@/lib/constants/period'"
    );
    expect(budgetPeriodUtil).toContain('lookbackMonths = PERIOD_SELECTOR_MONTH_LIMIT');
  });

  it('keeps period dropdown options in a single column with no wrapped labels', () => {
    const periodNavigator = read('src/components/molecules/PeriodNavigator.astro');

    expect(periodNavigator).toContain('whitespace-nowrap');
    expect(periodNavigator).toContain('w-full text-left');
  });
});
