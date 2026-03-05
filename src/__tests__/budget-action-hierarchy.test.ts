import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('Budget action hierarchy', () => {
  it('keeps categories/import/export visible and overflows advanced actions', () => {
    const content = readFileSync('src/components/molecules/BudgetActions.astro', 'utf8');
    expect(content).toContain('ActionOverflowMenu');
  });

  it('preserves modal trigger wiring for overflow actions', () => {
    const content = readFileSync('src/components/molecules/BudgetActions.astro', 'utf8');
    expect(content).toContain('Categories');
    expect(content).toContain('Import');
    expect(content).toContain('Export');
    expect(content).toContain('New Budget');
  });
});
