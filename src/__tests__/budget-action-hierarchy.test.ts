import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('Budget action hierarchy', () => {
  it('uses ActionExpandable to keep categories and copy visible while hiding lower-frequency actions behind More', () => {
    const content = readFileSync('src/components/molecules/BudgetActions.astro', 'utf8');
    expect(content).toContain('ActionExpandable');
    expect(content).toContain('slot="always-visible"');
    expect(content).toContain('slot="expandable"');
    expect(content).toContain('Categories');
    expect(content).toContain('Copy');
  });

  it('preserves modal trigger wiring for expandable actions', () => {
    const content = readFileSync('src/components/molecules/BudgetActions.astro', 'utf8');
    expect(content).toContain('Categories');
    expect(content).toContain('Import');
    expect(content).toContain('Export');
    expect(content).toContain('New Budget');
  });
});
