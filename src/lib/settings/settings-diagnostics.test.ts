import { describe, expect, it, mock } from 'bun:test';
import { readFileSync } from 'node:fs';
import type { DiagnosticsData } from '@/types/diagnostics';
import { canViewServerDiagnostics, loadSettingsDiagnostics } from './settings-diagnostics';

const diagnostics = { timestamp: '2026-11-11T00:00:00.000Z' } as DiagnosticsData;

describe('settings diagnostics gate', () => {
  for (const role of ['admin', 'member'] as const) {
    it(`gives a workspace ${role} no diagnostics data and never probes the server`, async () => {
      const load = mock(async () => diagnostics);

      const result = await loadSettingsDiagnostics(role, load);

      expect(result).toEqual({ canView: false, data: null, error: null });
      expect(load).not.toHaveBeenCalled();
      expect(canViewServerDiagnostics(role)).toBe(false);
    });
  }

  it('loads diagnostics for a super_admin', async () => {
    const load = mock(async () => diagnostics);

    const result = await loadSettingsDiagnostics('super_admin', load);

    expect(result).toEqual({ canView: true, data: diagnostics, error: null });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reports a failed probe to a super_admin instead of throwing', async () => {
    const result = await loadSettingsDiagnostics('super_admin', async () => {
      throw new Error('cache unreachable');
    });

    expect(result).toEqual({ canView: true, data: null, error: 'cache unreachable' });
  });
});

describe('settings page', () => {
  const frontmatter = readFileSync('src/pages/settings/index.astro', 'utf8').split('---')[1];

  it('loads diagnostics only through the super_admin gate', () => {
    expect(frontmatter).toContain('loadSettingsDiagnostics(user.role');
    expect(frontmatter).not.toMatch(/if \(isAdmin\) \{\s*try \{\s*const diagnosticsService/);
  });
});
