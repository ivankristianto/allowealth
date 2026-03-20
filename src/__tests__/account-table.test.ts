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

  it('includes on-target badge markers in desktop and mobile allocation badges', () => {
    const content = readFileSync('src/components/organisms/AccountTable.astro', 'utf8');

    expect(content).toContain('&check;');
    expect(content).toContain('{group.allocation.onTarget &&');

    const onTargetMatches = content.match(/group\.allocation\.onTarget/g) ?? [];
    expect(onTargetMatches.length).toBeGreaterThanOrEqual(2);
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

  it('uses visible focus styles on sortable header buttons instead of suppressing outlines', () => {
    const content = readFileSync('src/components/organisms/AccountTable.astro', 'utf8');

    expect(content).not.toContain('focus:outline-none');
    expect(content).toContain('focus-visible:outline');
    expect(content).toContain('focus-visible:outline-2');
    expect(content).toContain('focus-visible:outline-offset-2');
    expect(content).toContain('focus-visible:outline-accent');
  });

  it('renders mobile secondary metadata with an optional category instead of falling back to type', () => {
    const content = readFileSync('src/components/organisms/AccountTable.astro', 'utf8');
    const normalized = normalize(content);

    expect(content).not.toContain('const categoryLabel = account.category_name || typeLabel;');
    expect(normalized).toContain(
      normalize(`
        const categoryLabel = account.category_name?.trim() || null;
        const secondaryMeta = [categoryLabel, account.owner_name]
          .filter(Boolean)
          .join(' | ');
      `)
    );
    expect(normalized).toContain(
      normalize(`
        {secondaryMeta && (
          <div class="mt-1 text-xs text-base-content/50">{secondaryMeta}</div>
        )}
      `)
    );
  });
});
