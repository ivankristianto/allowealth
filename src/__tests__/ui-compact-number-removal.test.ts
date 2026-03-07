import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('compact number UI removal', () => {
  it('removes compact number settings from the settings page source', () => {
    const source = read('src/pages/settings/index.astro');

    expect(source).not.toContain('Compact Number Display');
    expect(source).not.toMatch(/\bcompactNumbers\b/);
  });

  it('removes the compact rendering branch from Currency.astro', () => {
    const source = read('src/components/atoms/Currency.astro');

    expect(source).not.toContain('compact?: boolean');
    expect(source).not.toContain('compact = false');
  });

  it('updates budget history table to use full currency formatting', () => {
    const source = read('src/components/partials/BudgetHistoryTablePartial.astro');

    expect(source).toContain('formatCurrency(balance, currency)');
  });

  it('updates budget category trends to use full currency formatting', () => {
    const source = read('src/components/partials/BudgetCategoryTrendsPartial.astro');

    expect(source).toContain('formatCurrency(spentAmount, currency)');
    expect(source).toContain('formatCurrency(budgetAmount, currency)');
  });

  it('updates the spending card to use full budget formatting', () => {
    const source = read('src/components/organisms/SpendingCard.astro');

    expect(source).toContain('const budgetFormatted = formatCurrency(budget, currency);');
  });

  it('updates wealth trajectory summary and chart formatting to full values', () => {
    const source = read('src/components/organisms/WealthTrajectory.astro');

    expect(source).toContain('formatCurrency(summary.year10Target, currency)');
    expect(source).toContain('formatCurrency(summary.totalInterest, currency)');
    expect(source).toContain('return `${label}: ${formatCurrency(value, currency)}`;');
    expect(source).toContain('return formatCurrency(Number(value), currency);');
  });

  it('updates wealth trajectory live client updates to full values', () => {
    const source = read('src/components/organisms/WealthTrajectory.client.ts');

    expect(source).toContain('formatCurrency(summary.year10Target, currency)');
    expect(source).toContain('formatCurrency(summary.totalInterest, currency)');
  });

  it('updates ledger projections to use full currency formatting', () => {
    const source = read('src/components/organisms/LedgerProjections.astro');

    expect(source).toContain('formatCurrency(row.forecastInterest, currency)');
    expect(source).toContain('formatCurrency(row.forecastBalance, currency)');
    expect(source).toContain('formatCurrency(row.realInterest, currency)');
    expect(source).toContain('formatCurrency(row.realBalance, currency)');
  });
});
