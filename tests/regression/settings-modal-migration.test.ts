import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const readTemplate = (path: string) => {
  const source = read(path);
  const parts = source.split('---');

  return parts.length >= 3 ? parts.slice(2).join('---') : source;
};

function expectInAscendingOrder(source: string, markers: string[]) {
  let previousIndex = -1;

  for (const marker of markers) {
    const currentIndex = source.indexOf(marker);
    expect(currentIndex).toBeGreaterThanOrEqual(0);
    expect(currentIndex).toBeGreaterThan(previousIndex);
    previousIndex = currentIndex;
  }
}

describe('settings page refinement regressions', () => {
  it('uses the approved max-w-6xl shell width', () => {
    const source = read('src/pages/settings/index.astro');

    expect(source).toContain('max-w-6xl');
  });

  it('keeps server stats admin-gated in navItems.push(...)', () => {
    const source = read('src/pages/settings/index.astro');

    expect(source).toContain(
      "if (isAdmin) {\n  navItems.push({ id: 'server-stats', label: 'Server Stats', icon: Server });\n}"
    );
  });

  it('still renders DiagnosticsDisplay on the settings page', () => {
    const source = read('src/pages/settings/index.astro');

    expect(source).toContain('<DiagnosticsDisplay data={diagnosticsData} />');
  });

  it('keeps invitation and destructive controls behind existing demo/admin guards', () => {
    const source = read('src/pages/settings/index.astro');

    expect(source).toContain('isAdmin && !demoMode && (');
    expect(source).toContain('disabled={!isAdmin}');
    expect(source).toContain('data-open-modal="clear-history-modal"');
    expect(source).toContain('data-open-modal="factory-reset-modal"');
  });
});

describe('invite member modal refinement regressions', () => {
  it('removes the top-right close button via closable={false}', () => {
    const source = read('src/components/organisms/InviteMemberModal.astro');

    expect(source).toContain('closable={false}');
  });

  it('keeps backdropClose enabled', () => {
    const source = read('src/components/organisms/InviteMemberModal.astro');

    expect(source).toContain('backdropClose={true}');
  });

  it('keeps the dialog labeled for accessibility', () => {
    const source = read('src/components/organisms/InviteMemberModal.astro');

    expect(source).toContain('ariaLabel="Invite member"');
  });
});

describe('diagnostics layout refinement regressions', () => {
  it('contains the approved diagnostics layout markers', () => {
    const source = read('src/components/organisms/DiagnosticsDisplay.astro');

    expect(source).toContain('Configuration status');
    expect(source).toContain('Runtime Environment');
    expect(source).toContain('Database');
    expect(source).toContain('Cache');
    expect(source).toContain('Environment Variables');
    expect(source).toContain('Last updated:');
  });

  it('renders summary-first diagnostics structure in the approved order', () => {
    const source = readTemplate('src/components/organisms/DiagnosticsDisplay.astro');

    expectInAscendingOrder(source, [
      'data-testid="diagnostics-summary"',
      'Configuration status',
      'Runtime Environment',
      'Database',
      'Cache',
      'Environment Variables',
      'Last updated:',
    ]);
  });

  it('keeps the timestamp footer as the closing diagnostics row', () => {
    const source = read('src/components/organisms/DiagnosticsDisplay.astro');

    expect(source).toContain('<footer');
    expect(source.indexOf('Last updated:')).toBeGreaterThan(
      source.indexOf('Environment Variables')
    );
  });
});
