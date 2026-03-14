import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('settings page demo mode restrictions', () => {
  it('reads demo mode in frontmatter', () => {
    const source = readFileSync('src/pages/settings/index.astro', 'utf8');

    expect(source).toContain("import { isDemoMode } from '@/lib/demo-mode';");
    expect(source).toContain('const demoMode = isDemoMode();');
  });

  it('hides invitation management and shows a demo-mode notice', () => {
    const source = readFileSync('src/pages/settings/index.astro', 'utf8');

    expect(source).toContain('isAdmin && !demoMode && (');
    expect(source).toContain('!demoMode && isAdmin && invitations.length > 0 && (');
    expect(source).toContain('!demoMode && isAdmin && invitations.length === 0 && (');
    expect(source).toContain('Member invitations are disabled in demo mode.');
  });
});
