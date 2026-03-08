import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/components/organisms/TransactionFiltersBar.astro', 'utf8');

describe('TransactionFiltersBar', () => {
  it('uses semantic buttons and a hidden input for the type filter contract', () => {
    expect(source).toContain('<input type="hidden" name="type" value={typeFilter}');
    expect(source).toContain('data-filter-type="expense"');
    expect(source).toContain('data-filter-type="income"');
    expect(source).toContain("aria-pressed={typeFilter === 'expense'}");
    expect(source).toContain("aria-pressed={typeFilter === 'income'}");
    expect(source).not.toContain('<a data-filter-type=');
  });

  it('keeps progressive-enhancement URLs on the type buttons', () => {
    expect(source).toContain('const buildFilterUrl = (updates: Record<string, string>) => {');
    expect(source).toContain("data-filter-url={buildFilterUrl({ type: 'expense' })}");
    expect(source).toContain("data-filter-url={buildFilterUrl({ type: 'income' })}");
    expect(source).toContain("if (searchValue) params.set('search', searchValue);");
    expect(source).toContain(
      "if (categoryIds.length > 0) params.set('category_ids', categoryIds.join(','));"
    );
  });

  it('uses shared dropdown components for category and account filters', () => {
    expect(source).toContain(
      "import MultiSelectDropdown from '@/components/molecules/MultiSelectDropdown.astro'"
    );
    expect(source).toContain('inputName="category_ids"');
    expect(source).toContain('filterEventType="category_ids"');
    expect(source).toContain('inputName="account_ids"');
    expect(source).toContain('filterEventType="account_ids"');
  });

  it('keeps the search form semantics and reset control', () => {
    expect(source).toContain('role="search"');
    expect(source).toContain('aria-label="Filter transactions"');
    expect(source).toContain('data-filter-form');
    expect(source).toContain('data-reset-filters');
  });
});
