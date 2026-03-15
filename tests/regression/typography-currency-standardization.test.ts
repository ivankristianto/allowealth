import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();

const read = (path: string) => readFileSync(join(projectRoot, path), 'utf8');
const tabularNumsFiles = [
  'src/pages/accounts/[id].astro',
  'src/pages/accounts/bulk-add-accounts.client.ts',
  'src/components/partials/TransactionSummaryPartial.astro',
  'src/components/partials/IncomeMemberTablePartial.astro',
  'src/components/partials/IncomeSourceTablePartial.astro',
  'src/components/partials/IncomeSummaryCardsPartial.astro',
  'src/components/partials/MemberSpendingTablePartial.astro',
  'src/components/partials/OverviewPreviewCardsPartial.astro',
  'src/components/partials/OverviewSummaryCardsPartial.astro',
  'src/components/partials/RecurringStatsPartial.astro',
  'src/components/partials/IncomeHistoryTablePartial.astro',
  'src/components/organisms/TransactionDrawer.astro',
  'src/components/organisms/TransactionDrawer.client.ts',
  'src/components/organisms/TransactionSummaryCards.astro',
  'src/components/organisms/RecurringPendingList.astro',
  'src/components/organisms/RecurringTemplateList.astro',
  'src/components/organisms/ForecastTable.astro',
  'src/components/organisms/ForecastSummary.astro',
  'src/components/organisms/AccountPortfolioSummary.astro',
  'src/components/molecules/TransactionDateGroups.astro',
];

describe('typography and currency standardization', () => {
  it('uses global tabular figures and removes monospace styling from numeric atoms', () => {
    const globals = read('src/styles/globals.css');
    const currency = read('src/components/atoms/Currency.astro');
    const percentage = read('src/components/atoms/Percentage.astro');

    expect(globals).toContain('font-variant-numeric: tabular-nums;');
    expect(currency).not.toContain('font-mono');
    expect(percentage).not.toContain('font-mono');
  });

  it('removes redundant tabular-nums utility usage from the planned files', () => {
    for (const filePath of tabularNumsFiles) {
      expect(read(filePath)).not.toContain('tabular-nums');
    }
  });
});
