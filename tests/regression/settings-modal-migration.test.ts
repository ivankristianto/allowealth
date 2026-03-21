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

function readDiagnosticsSummarySource() {
  const source = readTemplate('src/components/organisms/DiagnosticsDisplay.astro');
  const startIndex = source.indexOf('data-testid="diagnostics-summary"');
  const endIndex = source.indexOf('</section>', startIndex);

  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex + '</section>'.length);
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

  it('renders backup and restore before the danger zone in the data tab', () => {
    const source = readTemplate('src/pages/settings/index.astro');

    expect(source.indexOf('Backup & Restore')).toBeGreaterThanOrEqual(0);
    expect(source.indexOf('Danger Zone')).toBeGreaterThanOrEqual(0);
    expect(source.indexOf('Backup & Restore')).toBeLessThan(source.indexOf('Danger Zone'));
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

  it('uses an accent ghost action style with explicit active-state contrast', () => {
    const actionClassSource = read('src/lib/ui/action-button-classes.ts');
    const settingsSource = read('src/pages/settings/index.astro');

    expect(actionClassSource).toContain('active:bg-accent');
    expect(actionClassSource).toContain('active:text-accent-content');
    expect(settingsSource).toContain('const inviteMemberButtonClassName = accentGhostBtn');
    expect(settingsSource).toContain('variant="ghost"');
  });
});

describe('settings destructive modal regressions', () => {
  it('removes the top-right close button from the clear history modal', () => {
    const source = read('src/pages/settings/index.astro');

    expect(source).toContain('id="clear-history-modal"');
    expect(source).toContain('closable={false}');
  });

  it('removes the top-right close button from the factory reset modal', () => {
    const source = read('src/pages/settings/index.astro');

    expect(source).toContain('id="factory-reset-modal"');
    expect(source).toContain('closable={false}');
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

  it('locks the console summary redesign structure', () => {
    const source = readDiagnosticsSummarySource();

    expect(source).toContain('data-testid="diagnostics-summary"');
    expect(source).not.toContain('flex h-12 w-12 items-center justify-center rounded-2xl');
    expect(source).not.toMatch(/class="[^"]*\bbadge\b[^"]*"/);
    expect(source).not.toMatch(/class=\{[^}]*badge[^}]*\}/);
    expect(source).toContain('<Card padding="lg" className="@container">');
    expect(source).toContain('class={summaryReadoutRowClass}');
    expect(source).toContain('class={summaryReadoutValueClass}');
    expectInAscendingOrder(source, [
      'data-summary-marker="runtime"',
      'data-summary-marker="data-layer"',
      'data-summary-marker="caching"',
    ]);
    expectInAscendingOrder(source, ['Runtime', 'data-summary-value="runtime"', 'Environment']);
    expectInAscendingOrder(source, ['Data Layer', 'Driver', 'Platform']);
    expectInAscendingOrder(source, ['Caching', 'Enabled']);
  });

  it('renders the summary content in the readout order', () => {
    const source = readDiagnosticsSummarySource();

    expectInAscendingOrder(source, [
      'Runtime',
      'data-summary-value="runtime"',
      'Environment',
      'App Version',
    ]);
    expectInAscendingOrder(source, ['Data Layer', 'Driver', 'Platform']);
  });

  it('keeps a platform detail row even when query metrics are absent', () => {
    const source = read('src/components/organisms/DiagnosticsDisplay.astro');

    expect(source).toContain(
      "const summaryReadoutRowClass =\n  'grid grid-cols-1 gap-y-1 border-t border-base-200 py-3 first:border-t-0 first:pt-0 @2xl:grid-cols-[auto_minmax(0,1fr)] @2xl:items-start @2xl:gap-x-4 @2xl:gap-y-0';"
    );
    expect(source).toContain(
      "const summaryReadoutValueClass =\n  'min-w-0 break-words text-left text-sm font-medium leading-6 text-base-content @2xl:text-right';"
    );
    expect(source).toContain(
      "const databasePlatformLabel = data.database.isD1 ? 'Cloudflare D1' : 'Local SQLite';"
    );
    expect(source).toContain('<dt class={summaryReadoutLabelClass}>Platform</dt>');
    expect(source).toContain('<dd class={summaryReadoutValueClass}>{databasePlatformLabel}</dd>');
    expect(source).toContain('data.database.queryMetrics && (');
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

  it('shows the app version and changelog link in the runtime diagnostics block', () => {
    const source = read('src/components/organisms/DiagnosticsDisplay.astro');

    expect(source).toContain('App Version');
    expect(source).toContain('https://docs.allowealth.io/changelog/');
  });
});

describe('settings data tab refinement regressions', () => {
  it('uses accent-tinted warning styling for the clear-history callout', () => {
    const source = read('src/pages/settings/index.astro');

    expect(source).toContain(
      'class="alert border border-accent/20 bg-accent/10 py-3 text-sm text-base-content"'
    );
  });
});
