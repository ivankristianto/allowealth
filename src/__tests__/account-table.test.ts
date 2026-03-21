import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

const normalize = (value: string) => value.replace(/\s+/g, ' ');

describe('AccountTable', () => {
  it('renders debt group totals as negative values', () => {
    const content = readFileSync('src/components/organisms/AccountTable.astro', 'utf8');

    expect(content).toContain(
      "return formatCurrency(groupClass === 'debt' ? -Math.abs(amount) : amount, currency);"
    );
  });

  it('uses design-system semantic classes for group headers instead of hardcoded hex gradients', () => {
    const content = readFileSync('src/components/organisms/AccountTable.astro', 'utf8');

    expect(content).not.toContain('from-[#');
    expect(content).not.toContain('to-[#');
    expect(content).toContain('bg-base-200/70');
    expect(content).toContain('text-accent');
    expect(content).toContain('text-warning');
    expect(content).toContain('text-info');
  });

  it('includes on-target badge markers in allocation badges', () => {
    const content = readFileSync('src/components/organisms/AccountTable.astro', 'utf8');

    expect(content).toContain('&check;');
    expect(content).toContain('{group.allocation.onTarget &&');

    const onTargetMatches = content.match(/group\.allocation\.onTarget/g) ?? [];
    expect(onTargetMatches.length).toBeGreaterThanOrEqual(1);
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

  it('uses a fluid table width without fixed min-width to avoid horizontal scroll', () => {
    const content = readFileSync('src/components/organisms/AccountTable.astro', 'utf8');

    expect(content).toContain('w-full border-collapse');
    expect(content).not.toContain('table-fixed');
    expect(content).not.toContain('min-w-[');
  });

  it('uses visible focus styles on sortable header buttons instead of suppressing outlines', () => {
    const content = readFileSync('src/components/organisms/AccountTable.astro', 'utf8');

    expect(content).not.toContain('focus:outline-none');
    expect(content).toContain('focus-visible:outline');
    expect(content).toContain('focus-visible:outline-2');
    expect(content).toContain('focus-visible:outline-offset-2');
    expect(content).toContain('focus-visible:outline-accent');
  });

  it('does not render a separate mobile card fallback', () => {
    const content = readFileSync('src/components/organisms/AccountTable.astro', 'utf8');

    expect(content).not.toContain('md:hidden');
    expect(content).not.toContain('account-table-mobile-history-');
  });

  it('hides secondary headers on mobile so balance and actions stay reachable without horizontal scrolling', () => {
    const content = readFileSync('src/components/organisms/AccountTable.astro', 'utf8');
    const normalized = normalize(content);

    expect(normalized).toContain(
      normalize(`
        <th
          scope="col"
          class="hidden px-2 py-2.5 text-xs font-bold uppercase tracking-widest text-base-content/40 md:table-cell md:px-3"
          data-sort-key="type"
      `)
    );
    expect(normalized).toContain(
      normalize(`
        <th
          scope="col"
          class="hidden px-2 py-2.5 text-xs font-bold uppercase tracking-widest text-base-content/40 md:table-cell md:px-3"
          data-sort-key="category"
      `)
    );
    expect(normalized).toContain(
      normalize(`
        <th
          scope="col"
          class="hidden px-2 py-2.5 text-xs font-bold uppercase tracking-widest text-base-content/40 md:table-cell md:px-3"
          data-sort-key="owner"
      `)
    );
    expect(normalized).toContain(
      normalize(`
        <th
          scope="col"
          class="hidden px-2 py-2.5 text-xs font-bold uppercase tracking-widest text-base-content/40 md:table-cell md:px-3"
          data-sort-key="updated"
      `)
    );
  });
});
