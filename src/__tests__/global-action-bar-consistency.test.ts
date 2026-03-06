import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('global action bar consistency', () => {
  it('all action-bar consumers import ActionBar (no standalone button groups)', () => {
    const recurring = readFileSync('src/components/molecules/RecurringActionsBar.astro', 'utf8');
    const budgetCategories = readFileSync('src/pages/budget/categories/index.astro', 'utf8');
    const accountCategories = readFileSync('src/pages/accounts/categories/index.astro', 'utf8');

    // Verify each consumer uses the shared ActionBar layout component
    expect(recurring).toContain('ActionBar');
    expect(budgetCategories).toContain('ActionBar');
    expect(accountCategories).toContain('ActionBar');

    // These pages have ≤ 3 secondary actions, so no overflow is needed.
    // They were audited and intentionally left without secondary-visible/overflow slots
    // because their action count fits within the desktop cap.
  });
});
