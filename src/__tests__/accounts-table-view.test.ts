import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const normalize = (value: string) => value.replace(/\s+/g, ' ');

describe('accounts table view integration wiring', () => {
  it('keeps the account table group order and row markers aligned with grouped sorting', () => {
    const tableSource = read('src/components/organisms/AccountTable.astro');

    expect(tableSource).toContain(
      "const CLASS_ORDER: AccountClass[] = ['liquid', 'debt', 'non_liquid'];"
    );
    expect(tableSource).toContain('data-group-header={group.classKey}');
    expect(tableSource).toContain('data-account-table-row={account.id}');
  });

  it('exposes all row sort attributes used by the table client', () => {
    const rowSource = read('src/components/molecules/AccountTableRow.astro');
    const clientSource = read('src/components/organisms/accounts-table.client.ts');

    expect(clientSource).toContain(
      "const SORT_COLUMNS: SortColumn[] = ['name', 'type', 'category', 'owner', 'balance', 'updated'];"
    );

    expect(rowSource).toContain('data-account-table-row={id}');
    expect(rowSource).toContain('data-sort-name={name.toLowerCase()}');
    expect(rowSource).toContain('data-sort-type={typeLabel.toLowerCase()}');
    expect(rowSource).toContain("data-sort-category={(categoryName || '').toLowerCase()}");
    expect(rowSource).toContain("data-sort-owner={(ownerName || '').toLowerCase()}");
    expect(rowSource).toContain('data-sort-balance={Math.abs(balance)}');
    expect(rowSource).toContain('data-sort-updated={lastUpdatedDate.getTime()}');
  });

  it('renders accessible view toggle controls for card and table modes', () => {
    const controlsSource = read('src/components/molecules/AccountFilterControls.astro');

    expect(controlsSource).toContain('data-view-toggle');
    expect(controlsSource).toContain('data-view-mode="card"');
    expect(controlsSource).toContain('data-view-mode="table"');
    expect(controlsSource).toContain("aria-pressed={defaultView === 'card' ? 'true' : 'false'}");
    expect(controlsSource).toContain("aria-pressed={defaultView === 'table' ? 'true' : 'false'}");
  });

  it('wires the accounts page to both views, filter controls, and the table client integration', () => {
    const pageSource = read('src/pages/accounts/index.astro');
    const normalizedPageSource = normalize(pageSource);

    expect(pageSource).toContain('import AccountFilterControls from');
    expect(pageSource).toContain('<AccountFilterControls');
    expect(pageSource).toContain('data-view="card"');
    expect(pageSource).toContain('data-view="table"');
    expect(pageSource).toContain(
      "import { initAccountsTableClient } from '@/components/organisms/accounts-table.client';"
    );
    expect(pageSource).toContain('initAccountsTableClient();');
    expect(normalizedPageSource).toContain('<div data-view="table" class="hidden"> <AccountTable');
  });

  it('passes the table primary currency through active filters before workspace fallback', () => {
    const pageSource = read('src/pages/accounts/index.astro');
    const normalizedPageSource = normalize(pageSource);
    const expectedPrimaryCurrency = normalize(`
      primaryCurrency={
        filters.currency ?? allocationCurrency ?? orderedWorkspaceCurrencies[0] ?? 'IDR'
      }
    `);

    expect(normalizedPageSource).toContain(expectedPrimaryCurrency);
    expect(normalizedPageSource).not.toContain(
      "primaryCurrency={orderedWorkspaceCurrencies[0] || 'IDR'}"
    );
  });

  it('keeps uncategorized table rows nullable while preserving per-account type metadata', () => {
    const pageSource = read('src/pages/accounts/index.astro');
    const normalizedPageSource = normalize(pageSource);

    expect(normalizedPageSource).toContain(
      normalize(`
        const accountsWithDisplay = accounts.map((account) => ({
          ...account,
          category_name: account.category_id ? account.category_name : null,
          owner_name: memberNamesById.get(account.created_by_user_id),
        }));
      `)
    );
    expect(pageSource).toContain(': formatAccountType(account.type);');
  });

  it('persists the selected view mode and rebinds table behavior across Astro page transitions', () => {
    const clientSource = read('src/components/organisms/accounts-table.client.ts');

    expect(clientSource).toContain("const VIEW_STORAGE_KEY = 'accounts-view-mode';");
    expect(clientSource).toContain('window.localStorage.getItem(VIEW_STORAGE_KEY)');
    expect(clientSource).toContain('window.localStorage.setItem(VIEW_STORAGE_KEY, mode);');
    expect(clientSource).toContain('new AbortController()');
    expect(clientSource).toContain(
      "document.addEventListener('astro:page-load', initAccountsTableClient);"
    );
    expect(clientSource).toContain(
      "document.addEventListener('astro:before-swap', cleanupAccountsTableClient);"
    );
  });
});
