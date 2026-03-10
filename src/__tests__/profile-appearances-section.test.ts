import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('profile appearances section', () => {
  it('renders ManageAppearancesForm with the current server-side theme', () => {
    const profilePageSource = readFileSync('src/pages/profile.astro', 'utf8');

    expect(profilePageSource).toContain(
      "import ManageAppearancesForm from '@/components/organisms/ManageAppearancesForm.astro'"
    );
    expect(profilePageSource).toContain(
      "import DangerZone from '@/components/organisms/DangerZone.astro'"
    );
    expect(profilePageSource).toContain(
      "import { emailVerificationService, userMetaService } from '@/services';"
    );
    expect(profilePageSource).toContain(
      'const freshSettings = await userMetaService.getUserSettings(user.id);'
    );
    expect(profilePageSource).toContain("const currentTheme = freshSettings.theme || 'system';");
    expect(profilePageSource).toContain('<ManageAppearancesForm currentTheme={currentTheme} />');
    expect(profilePageSource).toContain('<DangerZone />');
    expect(profilePageSource).not.toContain('const userSettings = Astro.locals.userSettings');
  });
});
