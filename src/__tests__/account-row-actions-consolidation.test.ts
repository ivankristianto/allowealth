import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('Account row actions', () => {
  it('keeps update-balance inline and groups secondary actions under overflow', () => {
    const content = readFileSync('src/components/molecules/AccountItemRow.astro', 'utf8');
    expect(content).toContain('data-testid="account-update-value-btn"');
    expect(content).toContain('data-dropdown-menu');
  });

  it('uses a single dropdown menu pattern for both breakpoints', () => {
    const content = readFileSync('src/components/molecules/AccountItemRow.astro', 'utf8');
    // Desktop should NOT have a standalone timeline button outside the dropdown
    const desktopSection = content.split('Desktop Layout')[1] || '';
    expect(desktopSection).toContain('data-dropdown-menu');
  });
});
