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

  it('renders the actions cell only for non-historical view', () => {
    const content = readFileSync('src/components/molecules/AccountTableRow.astro', 'utf8');
    const normalizedContent = content.replace(/\s+/g, ' ');

    expect(normalizedContent).toContain(
      '{ !isHistoricalView && ( <td class="px-4 py-4 text-right md:px-6">'
    );
  });

  it('renders debt display from a negative absolute value', () => {
    const content = readFileSync('src/components/molecules/AccountTableRow.astro', 'utf8');

    expect(content).toContain('const displayBalance = isDebt ? -Math.abs(balance) : balance;');
  });
});
