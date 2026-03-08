import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('Accounts action hierarchy', () => {
  it('keeps New Account primary and uses ActionExpandable for secondary actions', () => {
    const content = readFileSync('src/components/organisms/AccountActions.astro', 'utf8');
    expect(content).toContain('New Account');
    expect(content).toContain('ActionExpandable');
    expect(content).toContain('slot="always-visible"');
    expect(content).toContain('slot="expandable"');
    expect(content).toContain('Transfer');
    expect(content).toContain('Bulk');
  });

  it('guards the expandable slot so historical views without closed accounts do not render a dead More toggle', () => {
    const content = readFileSync('src/components/organisms/AccountActions.astro', 'utf8');

    expect(content).toContain('const hasExpandableActions = !isHistoricalView || closedCount > 0;');
    expect(content).toMatch(/\{\s*hasExpandableActions && \(/);
  });
});
