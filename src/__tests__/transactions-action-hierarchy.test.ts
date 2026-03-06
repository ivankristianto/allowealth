import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('Transactions action hierarchy', () => {
  it('removes Add Expense and Add Income from page action bar', () => {
    const content = readFileSync('src/components/molecules/TransactionActionsBar.astro', 'utf8');
    expect(content).not.toContain('data-add-expense-button');
    expect(content).not.toContain('data-add-income-button');
  });

  it('uses ActionOverflowMenu for lower-frequency actions', () => {
    const content = readFileSync('src/components/molecules/TransactionActionsBar.astro', 'utf8');
    expect(content).toContain('ActionOverflowMenu');
  });
});
