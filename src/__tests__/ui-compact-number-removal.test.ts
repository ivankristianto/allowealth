import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const compactNumberSetting = ['compact', 'Numbers'].join('');
const compactNumberLabel = ['Compact Number', 'Display'].join(' ');

describe('compact number UI removal', () => {
  it('removes compact number settings from the settings page source', () => {
    const source = read('src/pages/settings/index.astro');

    expect(source).not.toContain(compactNumberLabel);
    expect(source).not.toMatch(new RegExp(`\\b${compactNumberSetting}\\b`));
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

    expect(source).toContain('formatCurrency(summary.latestActualBalance, currency)');
    expect(source).toContain('formatCurrency(summary.plannedEndingBalance, currency)');
    expect(source).toContain('formatCurrency(summary.currentTrajectoryEndingBalance, currency)');
    expect(source).toContain('return `${label}: ${formatCurrency(value, currency)}`;');
    expect(source).toContain('return formatCurrency(Number(value), currency);');
  });

  it('keeps the wealth trajectory client free of legacy compact formatting helpers', () => {
    const source = read('src/components/organisms/WealthTrajectory.client.ts');

    expect(source).toContain('buildWealthTrajectoryChartSeries');
    expect(source).not.toContain('formatCurrencyCompact');
  });

  it('updates ledger projections to use full currency formatting', () => {
    const source = read('src/components/organisms/LedgerProjections.astro');

    expect(source).toContain('formatValue(row.plannedEndingBalance, currency)');
    expect(source).toContain('formatValue(row.actualEndingBalance, currency)');
    expect(source).toContain('formatSignedValue(row.forecastInterestTotal, currency)');
    expect(source).toContain('formatSignedValue(row.actualNetSavingsTotal, currency)');
  });
});
