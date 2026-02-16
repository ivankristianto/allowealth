/**
 * Review Feedback Regression Tests
 *
 * Guards against regressions reported in code review.
 */

import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();

const read = (path: string) => readFileSync(join(projectRoot, path), 'utf8');

describe('review feedback regressions', () => {
  it('chart lifecycle should read data from nearest data-chart-data source', () => {
    const content = read('src/lib/utils/chart-lifecycle.ts');
    expect(content).toContain("closest('[data-chart-data]')");
  });

  it('allocation bar tooltip init should guard against duplicate handlers', () => {
    const content = read('src/components/molecules/AllocationBar.astro');
    expect(content).toContain('new WeakSet');
    expect(content).toContain('initializedBars');
  });

  it('category delete dialog should not use innerHTML for the icon', () => {
    const content = read('src/components/organisms/CategoryDeleteDialog.astro');
    expect(content).not.toContain('innerHTML');
  });

  it('transaction list delete modal should open via showModal', () => {
    const content = read('src/components/organisms/TransactionList.client.ts');
    expect(content).toContain('showModal');
  });

  it('period navigator should compute selected option before currentIndex', () => {
    const content = read('src/components/molecules/PeriodNavigator.astro');
    const selectedIndex = content.indexOf('const selectedOption');
    const currentIndex = content.indexOf('const currentIndex');
    expect(selectedIndex).toBeGreaterThanOrEqual(0);
    expect(currentIndex).toBeGreaterThanOrEqual(0);
    expect(selectedIndex).toBeLessThan(currentIndex);
  });

  it('period navigator should use native disabled attributes', () => {
    const content = read('src/components/molecules/PeriodNavigator.astro');
    expect(content).toContain('disabled={isPrevDisabled}');
    expect(content).toContain('disabled={isNextDisabled}');
  });

  it('period navigator client should skip handlers when disabled', () => {
    const content = read('src/components/molecules/PeriodNavigator.client.ts');
    expect(content).toContain('if (prevBtn.disabled)');
    expect(content).toContain('if (nextBtn.disabled)');
    expect(content).toContain('data-period-options-list');
    expect(content).toContain('suppressTouchClick');
    expect(content).toContain('touchmove');
  });

  it('transactions page comment should reference PeriodNavigator', () => {
    const content = read('src/components/organisms/TransactionsPage.client.ts');
    expect(content).toContain('PeriodNavigator');
    expect(content).not.toContain('MonthNavigator');
  });

  it('budget history table should use budgetStatus for desktop progress and badge', () => {
    const content = read('src/components/partials/BudgetHistoryTablePartial.astro');
    expect(content).toContain('status={budgetStatus.status}');
    expect(content).toContain('variant={budgetStatus.badgeVariant}');
    expect(content).not.toContain('percentageUsed >= 100');
  });

  it('budget history table should use token-driven classes', () => {
    const content = read('src/components/partials/BudgetHistoryTablePartial.astro');
    expect(content).toContain("from '@/lib/tokens'");
    expect(content).toContain('tokenClasses');
    expect(content).not.toContain('px-4 py-1.5');
    expect(content).not.toContain('mt-6');
  });

  it('category drilldown should guard against zero budget limit', () => {
    const content = read('src/components/partials/CategoryDrillDownPartial.astro');
    expect(content).toContain('budgetLimit > 0');
  });

  it('loading placeholders should not use animate-pulse in remaining components', () => {
    const files = [
      'src/components/molecules/RecentTransactionsList.astro',
      'src/components/molecules/TransactionCard.astro',
    ];

    files.forEach((path) => {
      const content = read(path);
      expect(content).not.toContain('animate-pulse');
    });
  });

  it('transactions page skeletons should not use animate-pulse', () => {
    const content = read('src/pages/transactions/index.astro');
    expect(content).not.toContain('animate-pulse');
  });

  it('data visualization chart docs should avoid direct init calls', () => {
    const content = read('design-system/06-data-visualization.md');
    expect(content).toContain("document.addEventListener('astro:page-load', init);");
    expect(content).not.toContain('init();');
  });

  it('patterns docs should pass Currency props as expressions', () => {
    const content = read('design-system/07-patterns.md');
    expect(content).toContain('<Currency amount={amount} currency={currency} />');
    expect(content).not.toContain('amount="{amount}"');
  });

  it('transactions page placeholders should use token-driven spacing', () => {
    const content = read('src/pages/transactions/index.astro');
    const forbidden = [
      /\bp-8\b/,
      /\bp-5\b/,
      /\bp-4\b/,
      /\bgap-5\b/,
      /\bgap-4\b/,
      /\bspace-y-3\b/,
      /\btext-sm\b/,
    ];

    forbidden.forEach((pattern) => {
      expect(content).not.toMatch(pattern);
    });
  });

  it('button atom should use DaisyUI btn class directly (not @apply contracts)', () => {
    const buttonContent = read('src/components/atoms/Button.astro');
    const globalStylesContent = read('src/styles/globals.css');

    // Must NOT use @apply with DaisyUI component classes — breaks CSS cascade
    // (Tailwind v4 + DaisyUI v5 @apply expands at late CSS position, causing
    // --btn-fg to override btn-accent text color via source order)
    expect(buttonContent).not.toContain("from '@/lib/ui/controlStyles'");
    expect(buttonContent).not.toContain('btn-contract-base');
    expect(buttonContent).not.toContain('btn-contract-outline');
    expect(globalStylesContent).not.toContain('.btn-contract-base');
    expect(globalStylesContent).not.toContain('.btn-contract-outline');

    // Must use DaisyUI btn class directly as utility
    expect(buttonContent).toContain("'btn ");
  });

  it('date picker story should use token classes for input styling', () => {
    const content = read('src/components/atoms/DatePicker.stories.ts');

    expect(content).toContain("from '@/lib/tokens'");
    expect(content).toContain('tokenClasses');
    expect(content).toContain('tokenClasses.inputSurfaceBase');
    expect(content).toContain('tokenClasses.inputFocusAccent');
    expect(content).toContain('tokenClasses.inputPaddingXl');
    expect(content).toContain('tokenClasses.inputHeightXl');
    expect(content).not.toContain(
      'h-14 rounded-lg border border-base-300 bg-base-200 px-6 text-base font-bold'
    );
  });

  it('transaction filters category search should have visible label and tokenized input classes', () => {
    const content = read('src/components/organisms/TransactionFiltersBar.astro');
    const inputSegments = content.match(/<input\b[\s\S]*?>/g) ?? [];
    const categorySearchSegment = inputSegments.find((segment) =>
      segment.includes('data-category-search')
    );
    const mainSearchSegment = inputSegments.find((segment) =>
      segment.includes('data-filter-search')
    );

    expect(content).toContain('<label for="category-search"');
    expect(content).toContain('Search categories');
    expect(content).toContain('id="category-search"');
    expect(content).toContain('data-category-search');
    expect(content).toContain('tokenClasses.inputSurfaceBase');
    expect(content).toContain('tokenClasses.inputFocusAccent');
    expect(content).toContain('tokenClasses.inputPaddingSearchCompact');
    expect(content).toContain('tokenClasses.inputPaddingSearchDefault');

    expect(categorySearchSegment).toBeDefined();
    expect(mainSearchSegment).toBeDefined();
    expect(categorySearchSegment).not.toContain('input-sm');
    expect(categorySearchSegment).not.toContain('pl-8');
    expect(categorySearchSegment).not.toContain('pr-3');
    expect(categorySearchSegment).not.toContain('py-2');
    expect(mainSearchSegment).not.toContain('pl-10');
    expect(mainSearchSegment).not.toContain('pr-3');
    expect(mainSearchSegment).not.toContain('sm:pl-11');
    expect(mainSearchSegment).not.toContain('sm:pr-4');
  });

  it('header should delegate drawer trigger in Header.client.ts and keep astro markup SSR-only', () => {
    const headerAstro = read('src/components/layouts/Header.astro');
    const headerClient = read('src/components/layouts/Header.client.ts');

    expect(headerAstro).toContain('data-open-transaction-drawer');
    expect(headerAstro).toContain("import './Header.client';");
    expect(headerAstro).not.toContain("getElementById('bulk-entry-button')");
    expect(headerClient).toContain("closest('[data-open-transaction-drawer]')");
    expect(headerClient).toContain("new CustomEvent('open-transaction-drawer')");
  });

  it('drawer should conditionally hide and always expose an accessible name', () => {
    const drawerAstro = read('src/components/molecules/Drawer.astro');

    expect(drawerAstro).toContain("!open && 'hidden'");
    expect(drawerAstro).toContain('aria-label=');
    expect(drawerAstro).toContain('aria-labelledby=');
  });

  it('drawer client should preserve and restore previous body overflow value', () => {
    const drawerClient = read('src/components/molecules/Drawer.client.ts');

    expect(drawerClient).toContain('previousBodyOverflow');
    expect(drawerClient).toContain("document.body.style.overflow = previousBodyOverflow ?? ''");
  });

  it('transactions page should validate parsed edit payload before opening modal', () => {
    const content = read('src/components/organisms/TransactionsPage.client.ts');

    expect(content).toContain('function isTransactionFormData');
    expect(content).toContain('if (!isTransactionFormData(parsed))');
    expect(content).toContain('Failed to load transaction details');
  });

  it('transaction count should include deleted rows by default with opt-out support', () => {
    const content = read('src/services/transaction.service.ts');
    const countStart = content.indexOf('async count(');
    const countEnd = content.indexOf('async importFromCSV(');

    expect(countStart).toBeGreaterThanOrEqual(0);
    expect(countEnd).toBeGreaterThan(countStart);

    const countMethod = content.slice(countStart, countEnd);
    expect(countMethod).toContain('filters.include_deleted ?? false');
    expect(countMethod).toContain('if (!includeDeleted)');
  });

  it('transaction history toggle should cache first HTML fetch and reuse it', () => {
    const content = read('src/components/molecules/TransactionHistory.client.ts');

    expect(content).toContain('dataset.historyLoaded');
  });

  it('openapi should document transaction history endpoint', () => {
    const rootSpec = read('openapi.yml');
    const transactionsPathSpec = read('openapi/paths/transactions.yml');

    expect(rootSpec).toContain('/api/transactions/{id}/history:');
    expect(transactionsPathSpec).toContain('/api/transactions/{id}/history:');
  });

  it('monthly transactions summary should exclude soft-deleted rows', () => {
    const content = read('src/pages/api/transactions/index.ts');
    expect(content).toContain('include_deleted: false');
  });

  it('drawer edit handler should use nullish coalescing, not logical OR', () => {
    const content = read('src/components/organisms/TransactionDrawer.client.ts');
    // setInput calls must use ?? to preserve zero values (amount: 0)
    expect(content).toContain("detail.amount ?? ''");
    expect(content).toContain('detail.currency ?? DEFAULT_CURRENCY');
    expect(content).not.toContain("data.amount || ''");
  });

  it('drawer event listeners should use typed CustomEvent payloads', () => {
    const content = read('src/components/organisms/TransactionDrawer.client.ts');
    expect(content).toContain('interface OpenDrawerDetail');
    expect(content).toContain('interface EditDrawerDetail');
    expect(content).toContain('CustomEvent<OpenDrawerDetail>');
    expect(content).toContain('CustomEvent<EditDrawerDetail>');
  });

  it('audit logging should be fire-and-forget (void, not await)', () => {
    const content = read('src/services/transaction.service.ts');
    expect(content).toContain('void logAuditEvent(');
    expect(content).not.toContain('await logAuditEvent(');
  });

  it('transaction history flag should be computed via service query, not separate API call', () => {
    const content = read('src/pages/api/transactions/index.ts');
    // has_history is now computed in-query via EXISTS subquery, not a separate getTransactionIdsWithHistory call
    expect(content).toContain('include_history_flag = true');
    expect(content).not.toContain('getTransactionIdsWithHistory');
  });

  it('TransactionHistoryEntry createdAt should be string for JSON serialization', () => {
    const content = read('src/lib/types/transaction.ts');
    expect(content).toContain('createdAt: string;');
    expect(content).not.toContain('createdAt: Date;');
  });

  it('show all history button should meet 44px touch target', () => {
    const content = read('src/components/partials/TransactionHistoryPartial.astro');
    expect(content).toContain('min-h-[44px]');
    expect(content).toContain('data-show-all-history');
  });

  it('desktop history button should be icon-only (btn-square)', () => {
    const content = read('src/components/molecules/TransactionCard.astro');
    // Desktop history button uses btn-square (icon-only, no text label)
    expect(content).toContain('btn btn-ghost btn-sm btn-square');
    expect(content).toContain('data-toggle-history');
  });
});
