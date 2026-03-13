import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('security page demo mode restrictions', () => {
  it('reads demo mode in frontmatter', () => {
    const source = readFileSync('src/pages/security.astro', 'utf8');

    expect(source).toContain("import { isDemoMode } from '@/lib/demo-mode';");
    expect(source).toContain('const demoMode = isDemoMode();');
  });

  it('replaces MFA and sessions cards with a demo-mode notice', () => {
    const source = readFileSync('src/pages/security.astro', 'utf8');

    expect(source).toContain('demoMode ? (');
    expect(source).toContain('Security settings are disabled in demo mode.');
    expect(source).toContain('<SecurityMfaCard');
    expect(source).toContain('<SecuritySessionsCard sessions={activeSessions} />');
  });
});
