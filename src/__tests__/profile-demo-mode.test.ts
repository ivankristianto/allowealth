import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('profile page demo mode restrictions', () => {
  it('passes demoMode from the profile page into ManageAccountForms', () => {
    const profileSource = readFileSync('src/pages/profile.astro', 'utf8');

    expect(profileSource).toContain("import { isDemoMode } from '@/lib/demo-mode';");
    expect(profileSource).toContain('const demoMode = isDemoMode();');
    expect(profileSource).toContain(
      '<ManageAccountForms user={user} pendingEmail={pendingEmail} demoMode={demoMode} />'
    );
  });

  it('replaces profile editing and password changes with demo-mode notices', () => {
    const formsSource = readFileSync('src/components/organisms/ManageAccountForms.astro', 'utf8');

    expect(formsSource).toContain('demoMode?: boolean;');
    expect(formsSource).toContain(
      'const { user, pendingEmail = null, demoMode = false } = Astro.props;'
    );
    expect(formsSource).toContain('Profile editing is disabled in demo mode.');
    expect(formsSource).toContain('Password changes are disabled in demo mode.');
  });
});
