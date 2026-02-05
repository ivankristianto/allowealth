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

  it('payment method confirm modal should open via showModal', () => {
    const content = read('src/components/organisms/PaymentMethodConfirmModal.astro');
    expect(content).toContain('showModal');
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
      'src/components/organisms/AssetUpdateTodoList.astro',
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
});
