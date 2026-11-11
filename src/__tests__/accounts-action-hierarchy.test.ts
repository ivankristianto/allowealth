import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('Accounts action hierarchy', () => {
  it('guards the expandable slot so historical views without closed accounts do not render a dead More toggle', () => {
    const content = readFileSync('src/components/organisms/AccountActions.astro', 'utf8');

    expect(content).toContain('const hasExpandableActions = !isHistoricalView || closedCount > 0;');
    expect(content).toMatch(/\{\s*hasExpandableActions && \(/);
  });
});
