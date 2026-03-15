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

  it('formats budget import preview amounts with the shared currency formatter', () => {
    const content = read('src/components/organisms/BudgetImportModal.astro');

    expect(content).toContain("import { formatCurrency } from '@/lib/formatting/currency-client';");
    expect(content).toContain(
      "class=\"text-right\">${formatCurrency(parseFloat(row.budget_amount) || 0, container.querySelector<HTMLInputElement>('[data-import-currency]')?.value || 'IDR')}"
    );
    expect(content).not.toContain('text-right font-mono');
  });

  it('formats transaction history create snapshots with formatCurrency', () => {
    const content = read('src/components/partials/TransactionHistoryPartial.astro');

    expect(content).toContain("import { formatCurrency } from '@/lib/formatting/currency';");
    expect(content).toContain('? formatCurrency(entry.newValue.amount, entry.newValue.currency)');
    expect(content).toContain('const formatFieldValue = (');
    expect(content).toContain('record?: Record<string, unknown> | null');
    expect(content).toContain(
      "if (field === 'amount' && (typeof value === 'string' || typeof value === 'number')) {"
    );
    expect(content).toContain('return currency ? formatCurrency(value, currency) : String(value);');
    expect(content).toContain('formatFieldValue(field, entry.oldValue?.[field], entry.oldValue)');
    expect(content).toContain('formatFieldValue(field, entry.newValue[field], entry.newValue)');
    expect(content).not.toContain('? `${entry.newValue.currency} ${entry.newValue.amount}`');
  });

  it('formats transaction card aria-label amounts with formatCurrency', () => {
    const content = read('src/components/molecules/TransactionCard.astro');

    expect(content).toContain("import { formatCurrency } from '@/lib/formatting/currency';");
    expect(content).toContain(
      "aria-label={`${transaction?.type === 'income' ? 'Income' : 'Expense'}: ${primaryText}, ${formatCurrency(amount, transaction?.currency)}`}"
    );
    expect(content).not.toContain(
      "aria-label={`${transaction?.type === 'income' ? 'Income' : 'Expense'}: ${primaryText}, ${amount} ${transaction?.currency}`}"
    );
  });

  it('formats recurring confirmation modal original amounts with formatCurrency', () => {
    const recurringPage = read('src/components/organisms/RecurringPage.client.ts');
    const recurringWidget = read('src/components/organisms/RecurringBillsWidget.client.ts');

    expect(recurringPage).toContain(
      "import { formatCurrency } from '@/lib/formatting/currency-client';"
    );
    expect(recurringWidget).toContain(
      "import { formatCurrency } from '@/lib/formatting/currency-client';"
    );
    expect(recurringPage).toContain(
      'originalAmount.textContent = `Original: ${formatCurrency(parseFloat(occurrence.templateAmount) || 0, confirmCurrency)}`;'
    );
    expect(recurringWidget).toContain(
      'originalAmount.textContent = `Original: ${formatCurrency(parseFloat(occurrence.templateAmount) || 0, confirmCurrency)}`;'
    );
    expect(recurringPage).not.toContain(
      'originalAmount.textContent = `Original: ${formatAmountForDisplay(occurrence.templateAmount, confirmCurrency)} ${occurrence.currency}`;'
    );
    expect(recurringWidget).not.toContain(
      'originalAmount.textContent = `Original: ${formatAmountForDisplay(occurrence.templateAmount, confirmCurrency)} ${occurrence.currency}`;'
    );
  });
});
