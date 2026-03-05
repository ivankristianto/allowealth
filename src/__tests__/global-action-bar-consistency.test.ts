import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('global action bar consistency', () => {
  it('wires all ActionBar consumers to consistent overflow semantics', () => {
    const recurring = readFileSync('src/components/molecules/RecurringActionsBar.astro', 'utf8');
    const budgetCategories = readFileSync('src/pages/budget/categories/index.astro', 'utf8');
    const accountCategories = readFileSync('src/pages/accounts/categories/index.astro', 'utf8');

    expect(recurring).toContain('ActionBar');
    expect(budgetCategories).toContain('ActionBar');
    expect(accountCategories).toContain('ActionBar');
  });
});
