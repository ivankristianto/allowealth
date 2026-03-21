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

  it('renders clickable row with accordion history wrapper', () => {
    const content = readFileSync('src/components/molecules/AccountTableRow.astro', 'utf8');

    expect(content).toContain('data-account-row={id}');
    expect(content).toContain('aria-controls={historyContainerId}');
    expect(content).toContain('aria-expanded="false"');
    expect(content).toContain('cursor-pointer');
    expect(content).toContain('data-expand-chevron={id}');
    expect(content).toContain('const historyContainerId = `account-table-history-${id}`;');
    expect(content).toContain('data-history-wrapper');
    expect(content).toContain('id={historyContainerId}');
    expect(content).toContain('data-history-container');
  });

  it('uses account name link for navigation instead of separate detail button', () => {
    const content = readFileSync('src/components/molecules/AccountTableRow.astro', 'utf8');

    expect(content).toContain('href={`/accounts/${id}`}');
    expect(content).not.toContain('data-inline-history-toggle');
    expect(content).not.toContain('data-testid="account-detail-btn"');
  });

  it('renders the actions cell only for non-historical view', () => {
    const content = readFileSync('src/components/molecules/AccountTableRow.astro', 'utf8');
    const normalizedContent = content.replace(/\s+/g, ' ');

    expect(normalizedContent).toContain(
      '{ !isHistoricalView && ( <td class="px-2 py-2.5 text-right md:px-3">'
    );
  });

  it('keeps mobile rows compact with inline metadata for hidden columns', () => {
    const content = readFileSync('src/components/molecules/AccountTableRow.astro', 'utf8');

    expect(content).toContain(
      'class="hidden px-2 py-2.5 text-sm text-base-content/70 md:table-cell md:px-3"'
    );
    expect(content).toContain('md:hidden');
    expect(content).toContain('const mobileCategoryLabel = categoryName?.trim() || null;');
    expect(content).toContain('const mobileSecondaryMeta = [mobileCategoryLabel, ownerName]');
    expect(content).toContain('Updated {formattedDate}');
  });

  it('preserves 44px action targets for table row controls', () => {
    const content = readFileSync('src/components/molecules/AccountTableRow.astro', 'utf8');

    expect(content).toContain('min-h-11 min-w-11');
    expect(content).not.toContain('min-h-9 min-w-9');
  });

  it('renders debt display from a negative absolute value', () => {
    const content = readFileSync('src/components/molecules/AccountTableRow.astro', 'utf8');

    expect(content).toContain('const displayBalance = isDebt ? -Math.abs(balance) : balance;');
  });
});
