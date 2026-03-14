import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('accounts reconciliation page wiring', () => {
  it('uses a reconciliation-specific account set so current-month math includes inactive accounts', () => {
    const page = readFileSync('src/pages/accounts/index.astro', 'utf8');

    expect(page).toContain('let reconciliationAccounts: AccountOutput[];');
    expect(page).toContain('const [rawAccounts, rawReconciliationAccounts] = await Promise.all([');
    expect(page).toContain('{ ...filters, includeInactive: true }');
    expect(page).toContain('reconciliationAccounts = rawReconciliationAccounts.map((account) => {');
    expect(page).toContain(
      'const reconciliationAccountIds = reconciliationAccounts.map((account) => account.id);'
    );
    expect(page).toContain('account_ids: reconciliationAccountIds,');
    expect(page).toContain('endAccounts: reconciliationAccounts.map((account) => ({');
  });
});
