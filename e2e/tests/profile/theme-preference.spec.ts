import { test, expect } from '../test.fixture';

function isKnownAstroDevToolbarNoise(message: string): boolean {
  return (
    message.includes("Error while running audit's match function") &&
    message.includes('TypeError: Failed to fetch')
  );
}

test.describe('Profile theme preference', () => {
  test('persists theme choices, keeps Danger Zone last, and syncs the dropdown quick-switch', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && !isKnownAstroDevToolbarNoise(message.text())) {
        consoleErrors.push(message.text());
      }
    });

    await page.goto('/profile');

    const publicProfileHeading = page.getByRole('heading', { name: 'Public Profile' });
    const changePasswordHeading = page.getByRole('heading', { name: 'Change Password' });
    const themeHeading = page.getByRole('heading', { name: 'Theme' });
    const dangerZoneHeading = page.getByRole('heading', { name: 'Danger Zone' });

    await expect(publicProfileHeading).toBeVisible();
    await expect(changePasswordHeading).toBeVisible();
    await expect(themeHeading).toBeVisible();
    await expect(dangerZoneHeading).toBeVisible();

    const publicProfileBox = await publicProfileHeading.boundingBox();
    const changePasswordBox = await changePasswordHeading.boundingBox();
    const themeBox = await themeHeading.boundingBox();
    const dangerZoneBox = await dangerZoneHeading.boundingBox();

    expect(publicProfileBox?.y).toBeLessThan(changePasswordBox?.y ?? 0);
    expect(changePasswordBox?.y).toBeLessThan(themeBox?.y ?? 0);
    expect(themeBox?.y).toBeLessThan(dangerZoneBox?.y ?? 0);

    const themeForm = page.locator('#appearances-form');
    const themeBadge = (label: string) =>
      themeForm.locator('label', { hasText: label }).locator('span[aria-hidden="true"]').first();
    const themeInput = (value: string) => themeForm.locator(`input[value="${value}"]`);

    await expect(themeInput('system')).toBeChecked();

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/api/user/theme') &&
          response.request().method() === 'PUT' &&
          response.ok()
      ),
      themeForm.locator('label', { hasText: 'Dark' }).click(),
    ]);
    await expect(page.getByTestId('toast-success')).toContainText('Theme updated');
    await expect(themeInput('dark')).toBeChecked();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(themeBadge('Dark')).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(themeInput('dark')).toBeChecked();
    await expect(themeBadge('Dark')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/api/user/theme') &&
          response.request().method() === 'PUT' &&
          response.ok()
      ),
      themeForm.locator('label', { hasText: 'Monochrome' }).click(),
    ]);
    await expect(themeInput('monochrome')).toBeChecked();
    await expect(themeBadge('Monochrome')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(
      await page.locator('html').evaluate((element) => (element as HTMLElement).style.filter)
    ).toBe('grayscale(100%)');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(themeInput('monochrome')).toBeChecked();
    await expect(themeBadge('Monochrome')).toBeVisible();
    expect(
      await page.locator('html').evaluate((element) => (element as HTMLElement).style.filter)
    ).toBe('grayscale(100%)');

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/api/user/theme') &&
          response.request().method() === 'PUT' &&
          response.ok()
      ),
      themeForm.locator('label', { hasText: 'System' }).click(),
    ]);
    await expect(themeInput('system')).toBeChecked();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(themeInput('system')).toBeChecked();

    await page.getByLabel('Open user menu').click();

    const themeSwitcher = page.locator('[data-theme-switcher]');
    await expect(themeSwitcher).toBeVisible();
    await expect(themeSwitcher.getByLabel('Switch to System theme')).toHaveClass(/text-accent/);

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/api/user/theme') &&
          response.request().method() === 'PUT' &&
          response.ok()
      ),
      themeSwitcher.getByLabel('Switch to Light theme').click(),
    ]);

    await expect(page.getByTestId('toast-success')).toContainText('Theme updated');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(themeInput('light')).toBeChecked();
    await expect(themeSwitcher.getByLabel('Switch to Light theme')).toHaveClass(/text-accent/);
    expect(consoleErrors).toEqual([]);
  });
});
