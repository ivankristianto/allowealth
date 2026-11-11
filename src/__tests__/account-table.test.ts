import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('AccountTable', () => {
  it('renders debt group totals as negative values', () => {
    const content = readFileSync('src/components/organisms/AccountTable.astro', 'utf8');

    expect(content).toContain(
      "return formatCurrency(groupClass === 'debt' ? -Math.abs(amount) : amount, currency);"
    );
  });

  it('renders sortable desktop headers as real buttons while keeping sort metadata on the header cells', () => {
    const content = readFileSync('src/components/organisms/AccountTable.astro', 'utf8');

    expect(content).toContain('<th');
    expect(content).toContain('data-sort-key="name"');
    expect(content).toContain('data-sort-key="balance"');
    expect(content).toContain('aria-sort="none"');
    expect(content).toContain('<button');
    expect(content).toContain('type="button"');
    expect(content).toContain('data-sort-button');
    expect(content).toContain('data-sort-indicator="name"');
    expect(content).toContain('data-sort-indicator="updated"');
  });
});
