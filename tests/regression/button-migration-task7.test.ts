import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();
const read = (path: string) => readFileSync(join(projectRoot, path), 'utf8');
const buttonCount = (source: string) => source.match(/<button\b/g)?.length ?? 0;

const fullyMigratedFiles = [
  'src/components/organisms/AccountCategoryModal.astro',
  'src/components/organisms/AccountFormModal.astro',
  'src/components/organisms/AccountGroupCard.astro',
  'src/components/organisms/AccountPortfolioSummary.astro',
  'src/components/organisms/AccountReconciliationCard.astro',
  'src/components/organisms/AccountTransferModal.astro',
  'src/components/organisms/AccountUpdateValueModal.astro',
  'src/components/organisms/ActionFilterBar.astro',
  'src/components/organisms/BudgetAdviceBanner.astro',
  'src/components/organisms/BudgetSummary.astro',
  'src/components/organisms/BudgetTable.astro',
  'src/components/organisms/CategoryIntelligenceTable.astro',
  'src/components/organisms/CategoryModal.astro',
  'src/components/organisms/CopyBudgetModal.astro',
  'src/components/organisms/ForecastCashflowChart.astro',
  'src/components/organisms/InitializeBudgetsModal.astro',
  'src/components/organisms/MfaBackupCodesModal.astro',
  'src/components/organisms/MfaConfirmModal.astro',
  'src/components/organisms/onboarding/StepAccounts.astro',
  'src/components/organisms/onboarding/StepAllocate.astro',
  'src/components/organisms/onboarding/StepCurrency.astro',
  'src/components/organisms/onboarding/StepFirstExpense.astro',
  'src/components/organisms/onboarding/StepIncome.astro',
  'src/components/organisms/RecurringCalendar.astro',
  'src/components/organisms/RecurringPendingList.astro',
  'src/components/organisms/RecurringSkipModal.astro',
  'src/components/organisms/SetNewBudgetModal.astro',
  'src/components/organisms/SpendingChart.astro',
  'src/components/organisms/TransactionList.astro',
  'src/components/partials/AccountCategoryTablePartial.astro',
  'src/components/partials/IncomeHistoryTablePartial.astro',
  'src/components/partials/PaginationPartial.astro',
  'src/components/partials/SecuritySessionsListPartial.astro',
  'src/components/partials/TransactionHistoryPartial.astro',
  'src/components/partials/TransactionSummaryPartial.astro',
];

describe('Task 7 button migration', () => {
  it('removes native buttons from fully migrated files', () => {
    for (const filePath of fullyMigratedFiles) {
      const source = read(filePath);
      expect(buttonCount(source)).toBe(0);
    }
  });

  it('leaves only approved exclusions as native buttons', () => {
    const accountHistory = read('src/components/organisms/AccountHistoryModal.astro');
    expect(buttonCount(accountHistory)).toBe(1);
    expect(accountHistory).toContain('<form method="dialog">');

    const recurringBills = read('src/components/organisms/RecurringBillsWidget.astro');
    expect(buttonCount(recurringBills)).toBe(2);
    expect(recurringBills.match(/role="menuitem"/g)?.length ?? 0).toBe(2);

    const transactionDrawer = read('src/components/organisms/TransactionDrawer.astro');
    expect(buttonCount(transactionDrawer)).toBe(2);
    expect(transactionDrawer.match(/role="tab"/g)?.length ?? 0).toBe(2);

    const drilldownPartial = read('src/components/partials/CategoryDrillDownPartial.astro');
    expect(buttonCount(drilldownPartial)).toBe(1);
    expect(drilldownPartial).toContain('<form method="dialog"');

    const drilldownModal = read('src/components/organisms/CategoryDrillDownModal.astro');
    expect(buttonCount(drilldownModal)).toBe(1);
    expect(drilldownModal).toContain('data-nav-prev');
    expect(drilldownModal).toContain('data-nav-next');
    expect(drilldownModal).toContain('<form method="dialog">');
  });
});
