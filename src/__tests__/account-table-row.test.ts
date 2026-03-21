import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('AccountTableRow', () => {
  it('adds sorting data attributes for all sortable columns', () => {
    const content = readFileSync('src/components/molecules/AccountTableRow.astro', 'utf8');

    expect(content).toContain('data-account-table-row={id}');
    expect(content).toContain('data-sort-balance={Math.abs(balance)}');
    expect(content).toContain('data-sort-name={name.toLowerCase()}');
    expect(content).toContain('data-sort-type={typeLabel.toLowerCase()}');
    expect(content).toContain("data-sort-category={(categoryName || '').toLowerCase()}");
    expect(content).toContain("data-sort-owner={(ownerName || '').toLowerCase()}");
    expect(content).toContain('data-sort-updated={lastUpdatedDate.getTime()}');
  });

  it('preserves modal action data attributes used by account row scripts', () => {
    const content = readFileSync('src/components/molecules/AccountTableRow.astro', 'utf8');

    expect(content).toContain('data-update-value-account={id}');
    expect(content).toContain('data-edit-account={id}');
    expect(content).toContain('data-history-account={id}');
    expect(content).toContain('data-close-account={id}');
    expect(content).toContain('data-account-category-name={categoryLabel}');
    expect(content).toContain('href={`/accounts/${id}`}');
  });

  it('renders a visible inline history toggle and companion detail row for table view', () => {
    const content = readFileSync('src/components/molecules/AccountTableRow.astro', 'utf8');

    expect(content).toContain('data-inline-history-toggle');
    expect(content).toContain('History');
    expect(content).toContain('const historyContainerId = `account-table-history-${id}`;');
    expect(content).toContain('aria-controls={historyContainerId}');
    expect(content).toContain('account-table-history-');
    expect(content).toContain('data-history-wrapper');
    expect(content).toContain('id={historyContainerId}');
    expect(content).toContain('data-history-container');
  });

  it('renders the desktop History action as a compact ghost button', () => {
    const content = readFileSync('src/components/molecules/AccountTableRow.astro', 'utf8');

    expect(content).toContain('className="min-h-9 rounded-lg border-0 px-2.5');
    expect(content).toContain('hover:bg-base-200');
    expect(content).not.toContain(
      'className="min-h-11 rounded-lg px-3 text-xs font-bold uppercase tracking-widest text-base-content/60 hover:border-accent/30 hover:bg-accent/10 hover:text-accent"'
    );
  });

  it('renders the actions cell only for non-historical view', () => {
    const content = readFileSync('src/components/molecules/AccountTableRow.astro', 'utf8');
    const normalizedContent = content.replace(/\s+/g, ' ');

    expect(normalizedContent).toContain(
      '{ !isHistoricalView && ( <td class="px-3 py-4 text-right md:px-4">'
    );
  });

  it('renders debt display from a negative absolute value', () => {
    const content = readFileSync('src/components/molecules/AccountTableRow.astro', 'utf8');

    expect(content).toContain('const displayBalance = isDebt ? -Math.abs(balance) : balance;');
  });
});
