import { test, expect } from '../test.fixture';

/**
 * E2E Tests for Admin Diagnostics Page.
 *
 * These tests verify:
 * - Super admin access controls
 * - Navigation to diagnostics page
 * - Runtime information display
 * - Database information display
 * - Cache information display
 * - Environment variables display
 * - Refresh functionality
 * - Access denial for non-super-admin users
 * - API authentication for unauthenticated requests
 *
 * @see /src/pages/admin/diagnostics.astro
 */
test.describe('Admin Diagnostics Page', () => {
  /**
   * Test: Unauthenticated API access returns 401
   * This test is outside beforeEach since it doesn't need auth
   */
  test('should return 401 for unauthenticated API access', async ({ request }) => {
    // Try to access diagnostics API without authentication
    const response = await request.get('/api/admin/diagnostics');

    // Verify 401 Unauthorized response
    expect(response.status()).toBe(401);
  });

  /**
   * Setup: Login as super admin user before each test.
   * Uses superadmin user from seed.ts which has super_admin role.
   */
  test.beforeEach(async ({ loginPage, page }) => {
    await loginPage.gotoLogin();
    // Super admin user from seed.ts has super_admin role
    await loginPage.login('superadmin@example.com', 'demo123456789');
  });

  /**
   * Test: Navigating to diagnostics page shows correct title
   */
  test('should display diagnostics page with correct title', async ({ page }) => {
    // Navigate to diagnostics page
    await page.goto('/admin/diagnostics');

    // Verify page title is visible
    await expect(page.locator('h1')).toContainText('Diagnostics');
  });

  /**
   * Test: Runtime information is displayed correctly
   */
  test('should display runtime information', async ({ page }) => {
    // Navigate to diagnostics page
    await page.goto('/admin/diagnostics');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Verify Runtime Environment section is visible
    const runtimeSection = page.locator('[data-testid="runtime-card"]');
    await expect(runtimeSection).toBeVisible();

    // Verify runtime badge contains one of: bun, workers, node
    const runtimeBadge = runtimeSection.locator('.badge-primary, .badge-neutral');
    await expect(runtimeBadge).toBeVisible();

    const runtimeText = await runtimeBadge.textContent();
    expect(
      ['bun', 'workers', 'node'].some((runtime) => runtimeText?.toLowerCase().includes(runtime))
    ).toBeTruthy();

    // Verify environment badge is present
    const envBadge = runtimeSection.locator('.badge-outline');
    await expect(envBadge).toBeVisible();
  });

  /**
   * Test: Database information is displayed
   */
  test('should display database information', async ({ page }) => {
    // Navigate to diagnostics page
    await page.goto('/admin/diagnostics');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Verify Database section is visible
    const databaseSection = page.locator('[data-testid="database-card"]');
    await expect(databaseSection).toBeVisible();

    // Verify dialect badge is present (sqlite or postgresql)
    const dialectBadge = databaseSection.locator('.badge-info, .badge-neutral');
    await expect(dialectBadge).toBeVisible();

    const dialectText = await dialectBadge.textContent();
    expect(
      ['sqlite', 'postgresql'].some((dialect) => dialectText?.toLowerCase().includes(dialect))
    ).toBeTruthy();

    // Verify connection status badge is present
    const connectionStatus = databaseSection
      .locator('text=Connected')
      .or(databaseSection.locator('text=Disconnected'));
    await expect(connectionStatus).toBeVisible();

    // Verify database URL is shown (masked/partial)
    const dbUrlLabel = databaseSection.locator('dt:has-text("Database URL")');
    await expect(dbUrlLabel).toBeVisible();
    await expect(databaseSection.locator('code')).toBeVisible();
  });

  /**
   * Test: Cache information is displayed
   */
  test('should display cache information', async ({ page }) => {
    // Navigate to diagnostics page
    await page.goto('/admin/diagnostics');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Verify Cache section is visible
    const cacheSection = page.locator('[data-testid="cache-card"]');
    await expect(cacheSection).toBeVisible();

    // Verify driver badge is present
    const driverBadge = cacheSection.locator('.badge-accent, .badge-neutral');
    await expect(driverBadge.first()).toBeVisible();

    // Verify status badge is present (healthy, error, or disabled)
    const statusBadge = cacheSection.locator('.badge-success, .badge-error, .badge-neutral');
    await expect(statusBadge).toBeVisible();

    // Verify enabled status is shown
    const enabledStatus = cacheSection.locator('text=Yes').or(cacheSection.locator('text=No'));
    await expect(enabledStatus).toBeVisible();
  });

  /**
   * Test: Environment variables table is displayed
   */
  test('should display environment variables', async ({ page }) => {
    // Navigate to diagnostics page
    await page.goto('/admin/diagnostics');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Verify Environment Variables section is visible
    const envSection = page.locator('h2:has-text("Environment Variables")').locator('..');
    await expect(envSection).toBeVisible();

    // Verify table is present
    const table = envSection.locator('.table');
    await expect(table).toBeVisible();

    // Verify NODE_ENV variable is shown
    await expect(table.locator('text=NODE_ENV')).toBeVisible();

    // Verify DATABASE_URL variable is shown
    await expect(table.locator('text=DATABASE_URL')).toBeVisible();

    // Verify status badges are present (Set, Missing, or Sensitive)
    const statusBadges = table.locator('.badge');
    await expect(statusBadges.first()).toBeVisible();
  });

  /**
   * Test: Non-super-admin users cannot access diagnostics page
   * Note: This test requires logging out and logging in as a member user
   */
  test('should deny access to non-super-admin users', async ({ loginPage, page }) => {
    // Logout and login as member user
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');

    // Find and click logout button
    const logoutButton = page.locator('button[aria-label="Logout"]');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    } else {
      // Alternative: navigate to logout endpoint
      await page.goto('/api/auth/logout');
    }

    // Login as member user
    await loginPage.gotoLogin();
    await loginPage.login('member@example.com', 'demo123456789');

    // Try to navigate to diagnostics page
    await page.goto('/admin/diagnostics');

    // Verify redirect to dashboard or 403
    await expect(page).toHaveURL(/\/(dashboard|403)/);
  });

  /**
   * Test: Configuration validation alerts are shown
   */
  test('should display configuration validation alerts', async ({ page }) => {
    // Navigate to diagnostics page
    await page.goto('/admin/diagnostics');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Verify configuration alerts section exists
    const alertsSection = page.locator('[aria-label="Configuration status"]');
    await expect(alertsSection).toBeVisible();

    // Verify section can display alerts (structure exists)
    // Note: actual alert count depends on environment configuration
    const alertCount = await alertsSection.locator('.alert-error, .alert-warning').count();

    if (alertCount > 0) {
      // If alerts exist, verify they have content
      const firstAlert = alertsSection.locator('.alert-error, .alert-warning').first();
      await expect(firstAlert).toBeVisible();
    }
  });

  /**
   * Test: Timestamp footer is displayed
   */
  test('should display timestamp footer', async ({ page }) => {
    // Navigate to diagnostics page
    await page.goto('/admin/diagnostics');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Verify footer with timestamp is present
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('Last updated:');

    // Verify time element has datetime attribute
    const timeElement = footer.locator('time');
    await expect(timeElement).toHaveAttribute('datetime');
  });
});
