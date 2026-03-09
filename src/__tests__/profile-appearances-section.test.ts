import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('profile appearances section', () => {
  it('renders ManageAppearancesForm with the current server-side theme', () => {
    const profilePageSource = readFileSync('src/pages/profile.astro', 'utf8');

    expect(profilePageSource).toContain(
      "import ManageAppearancesForm from '@/components/organisms/ManageAppearancesForm.astro'"
    );
    expect(profilePageSource).toContain(
      "import type { UserSettings } from '@/lib/constants/user-meta-keys'"
    );
    expect(profilePageSource).toContain(
      'const userSettings = Astro.locals.userSettings as UserSettings;'
    );
    expect(profilePageSource).toContain("const currentTheme = userSettings?.theme || 'system';");
    expect(profilePageSource).toContain('<ManageAppearancesForm currentTheme={currentTheme} />');
  });
});
