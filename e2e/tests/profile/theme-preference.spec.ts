import type { Page } from '@playwright/test';
import { test, expect } from '../test.fixture';
import { setThemeViaAPI } from '../../helpers';

function isKnownAstroDevToolbarNoise(message: string): boolean {
  return (
    message.includes("Error while running audit's match function") &&
    message.includes('TypeError: Failed to fetch')
  );
}

function collectConsoleErrors(page: Page): string[] {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !isKnownAstroDevToolbarNoise(message.text())) {
      consoleErrors.push(message.text());
    }
  });
  return consoleErrors;
}

function waitForThemeSave(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.url().includes('/api/user/theme') &&
      response.request().method() === 'PUT' &&
      response.ok()
  );
}

test.describe('Profile theme preference', () => {
  // Both projects share the demo user, so every test starts and ends on 'system'
  test.beforeEach(async ({ page }) => {
    await setThemeViaAPI(page.request, 'system');
  });

  test.afterEach(async ({ page }) => {
    await setThemeViaAPI(page.request, 'system');
  });

  test('persists theme choices and keeps Danger Zone last', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
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
      waitForThemeSave(page),
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
      waitForThemeSave(page),
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
      waitForThemeSave(page),
      themeForm.locator('label', { hasText: 'System' }).click(),
    ]);
    await expect(themeInput('system')).toBeChecked();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(themeInput('system')).toBeChecked();

    expect(consoleErrors).toEqual([]);
  });

  test('syncs the user menu quick-switch with the profile form', async ({ page, viewport }) => {
    // Below lg the sidebar is replaced by the mobile command center, which has no theme switcher
    test.skip((viewport?.width ?? 0) < 1024, 'quick-switch lives in the desktop sidebar');

    const consoleErrors = collectConsoleErrors(page);
    await page.goto('/profile');

    const themeInput = (value: string) =>
      page.locator('#appearances-form').locator(`input[value="${value}"]`);
    await expect(themeInput('system')).toBeChecked();

    await page.getByLabel('Open user menu').click();

    const themeSwitcher = page.locator('[data-theme-switcher]');
    await expect(themeSwitcher).toBeVisible();
    await expect(themeSwitcher.getByLabel('Switch to System theme')).toHaveClass(/text-accent/);

    await Promise.all([
      waitForThemeSave(page),
      themeSwitcher.getByLabel('Switch to Light theme').click(),
    ]);

    await expect(page.getByTestId('toast-success')).toContainText('Theme updated');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(themeInput('light')).toBeChecked();
    await expect(themeSwitcher.getByLabel('Switch to Light theme')).toHaveClass(/text-accent/);

    expect(consoleErrors).toEqual([]);
  });
});
