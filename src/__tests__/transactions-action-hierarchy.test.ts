import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('Transactions action hierarchy', () => {
  it('removes Add Expense and Add Income from page action bar', () => {
    const content = readFileSync('src/components/molecules/TransactionActionsBar.astro', 'utf8');
    expect(content).not.toContain('data-add-expense-button');
    expect(content).not.toContain('data-add-income-button');
  });

  it('uses ActionExpandable for lower-frequency actions', () => {
    const content = readFileSync('src/components/molecules/TransactionActionsBar.astro', 'utf8');
    expect(content).toContain('ActionExpandable');
    expect(content).toContain('slot="always-visible"');
    expect(content).toContain('slot="expandable"');
    expect(content).toContain('Import');
    expect(content).toContain('Export');
    expect(content).toContain('Scan');
  });
});
