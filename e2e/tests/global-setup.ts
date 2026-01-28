import { test as setup, expect } from '@playwright/test';

const E2E_PORT = 4320;
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

/**
 * Global setup for E2E tests.
 * Authenticates with demo user and saves session state.
 *
 * Credentials must match src/db/seed.ts DEMO_USER configuration.
 */
setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL || 'demo@example.com';
  const password = process.env.E2E_USER_PASSWORD || 'demo123456789';

  await page.goto(`${E2E_BASE_URL}/login`);

  // Wait for login form to be visible
  await expect(page.locator('[data-testid="email-input"]')).toBeVisible({
    timeout: 10000,
  });

  // Fill login form
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-btn"]');

  // Wait for redirect to dashboard (indicates successful login)
  await page.waitForURL('**/', { timeout: 10000 });

  // Save authentication state
  await page.context().storageState({ path: 'e2e/.auth/user.json' });
});
