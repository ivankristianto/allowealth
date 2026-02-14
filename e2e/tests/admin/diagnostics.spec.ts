import { test, expect } from '../test.fixture';

/**
 * E2E Tests for Admin Diagnostics Page.
 *
 * These tests verify:
 * - Admin-only access controls
 * - Diagnostics icon visibility for admin users
 * - Navigation to diagnostics page
 * - Runtime information display
 * - Database information display
 * - Cache information display
 * - Environment variables display
 * - Refresh functionality
 * - Access denial for non-admin users
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
   * Setup: Login as admin user before each test.
   * Uses demo user from seed.ts which has admin role.
   */
  test.beforeEach(async ({ loginPage, page }) => {
    await loginPage.gotoLogin();
    // Demo user from seed.ts has admin role
    await loginPage.login('demo@example.com', 'demo123456789');
  });

  /**
   * Test: Diagnostics icon is visible in header for admin users
   */
  test('should show diagnostics icon in header for admin users', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');

    // Verify admin diagnostics icon is present
    const adminIcon = page.locator('[data-admin-only="true"]');
    await expect(adminIcon).toBeVisible();

    // Verify it has correct aria-label
    await expect(adminIcon).toHaveAttribute('aria-label', 'Open System Diagnostics');

    // Verify it links to diagnostics page
    await expect(adminIcon).toHaveAttribute('href', '/admin/diagnostics');
  });

  /**
   * Test: Clicking diagnostics icon navigates to diagnostics page
   */
  test('should navigate to diagnostics page when clicking icon', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');

    // Click admin diagnostics icon
    const adminIcon = page.locator('[data-admin-only="true"]');
    await adminIcon.click();

    // Verify navigation to diagnostics page
    await expect(page).toHaveURL(/\/admin\/diagnostics/);

    // Verify page title is visible
    await expect(page.locator('h1')).toContainText('System Diagnostics');
  });

  /**
   * Test: Runtime information is displayed correctly
   */
  test('should display runtime information', async ({ page }) => {
    // Navigate to diagnostics page
    await page.goto('/admin/diagnostics');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Verify Runtime Information section is visible
    const runtimeSection = page.locator('h2:has-text("Runtime Information")').locator('..');
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

    // Verify Database Information section is visible
    const databaseSection = page.locator('h2:has-text("Database Information")').locator('..');
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
    const dbUrlRow = databaseSection.locator('td:has-text("Database URL")').locator('..');
    await expect(dbUrlRow.locator('code')).toBeVisible();
  });

  /**
   * Test: Cache information is displayed
   */
  test('should display cache information', async ({ page }) => {
    // Navigate to diagnostics page
    await page.goto('/admin/diagnostics');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Verify Cache Information section is visible
    const cacheSection = page.locator('h2:has-text("Cache Information")').locator('..');
    await expect(cacheSection).toBeVisible();

    // Verify driver badge is present
    const driverBadge = cacheSection.locator('.badge-primary');
    await expect(driverBadge).toBeVisible();

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
   * Test: Refresh button updates diagnostics timestamp
   */
  test('should refresh diagnostics when clicking refresh button', async ({ page }) => {
    // Navigate to diagnostics page
    await page.goto('/admin/diagnostics');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Get initial timestamp
    const footer = page.locator('footer');
    const initialTime = await footer.locator('time').textContent();

    // Click refresh button
    const refreshButton = page.locator('#refresh-diagnostics');
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();

    // Wait for page to reload
    await page.waitForLoadState('domcontentloaded');

    // Verify timestamp has changed (allowing up to 2 seconds for page reload)
    const updatedTime = await footer.locator('time').textContent();
    expect(updatedTime).not.toBe(initialTime);
  });

  /**
   * Test: Non-admin users cannot access diagnostics page
   * Note: This test requires logging out and logging in as a member user
   */
  test('should deny access to non-admin users', async ({ loginPage, page }) => {
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

    // Verify admin icon is not visible
    const adminIcon = page.locator('[data-admin-only="true"]');
    await expect(adminIcon).not.toBeVisible();
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
    const alertsSection = page.locator('#configuration-alerts');
    await expect(alertsSection).toBeVisible();

    // Check for any alerts (error, warning, or success)
    const hasAlerts = await alertsSection
      .locator('.alert-error, .alert-warning, .alert-success')
      .count();

    // At least one alert should be present (success if config is valid)
    expect(hasAlerts).toBeGreaterThan(0);
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
