import { test as setup, expect, type Page } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const E2E_PORT = 4320;
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

// Get directory name in ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const E2E_DB_PATH = path.join(PROJECT_ROOT, 'db', '.e2e.db');

async function waitForAuthenticatedLanding(page: Page) {
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 15000 })
    .toMatch(/^\/(dashboard|onboarding)$/);
}

async function tryLogin(page: Page, email: string, password: string): Promise<boolean> {
  await page.goto(`${E2E_BASE_URL}/login`);

  const emailInput = page.locator('#email');
  const passwordInput = page.locator('#password');
  const loginButton = page.getByTestId('login-btn');

  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await expect(loginButton).toBeVisible();
  await expect(loginButton).toBeEnabled();

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await loginButton.click();

  try {
    await waitForAuthenticatedLanding(page);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reset and seed the E2E database before running tests.
 * This ensures tests start with a clean, consistent database state.
 */
setup('reset database', async () => {
  // eslint-disable-next-line no-console -- Informational output for test setup
  console.info('🗑️  Resetting E2E database...');

  // Delete old database files
  const dbFiles = [E2E_DB_PATH, `${E2E_DB_PATH}-wal`, `${E2E_DB_PATH}-shm`];
  for (const file of dbFiles) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }

  // Push schema to create fresh database
  // eslint-disable-next-line no-console -- Informational output for test setup
  console.info('📦 Pushing database schema...');
  execSync('bun run db:push --force', {
    cwd: PROJECT_ROOT,
    env: { ...process.env, DATABASE_URL: 'db/.e2e.db' },
    stdio: 'inherit',
  });

  // Seed the database with test data
  // eslint-disable-next-line no-console -- Informational output for test setup
  console.info('🌱 Seeding database...');
  execSync('bun run db:seed', {
    cwd: PROJECT_ROOT,
    env: { ...process.env, DATABASE_URL: 'db/.e2e.db' },
    stdio: 'inherit',
  });

  // eslint-disable-next-line no-console -- Informational output for test setup
  console.info('✅ Database reset complete');
});

/**
 * Global setup for E2E tests.
 * Authenticates with demo user and saves session state.
 *
 * Credentials must match src/db/seed.ts DEMO_USER configuration.
 */
setup('authenticate', async ({ page }) => {
  // Timeout for authentication (E2E uses lighter Argon2 params for speed)
  setup.setTimeout(30000);
  const email = process.env.E2E_USER_EMAIL || 'demo@example.com';
  const password = process.env.E2E_USER_PASSWORD || 'demo123456789';

  if (!(await tryLogin(page, email, password))) {
    const fallbackEmail = `e2e-auth-${Date.now()}@test.com`;
    const signUpResponse = await page.request.post(`${E2E_BASE_URL}/api/auth/sign-up/email`, {
      data: {
        email: fallbackEmail,
        password,
        name: 'E2E Setup User',
        callbackURL: '/dashboard',
      },
    });

    if (!signUpResponse.ok()) {
      const errorBody = await signUpResponse.text();
      throw new Error(`Setup sign-up failed: ${signUpResponse.status()} ${errorBody}`);
    }

    await page.goto(`${E2E_BASE_URL}/dashboard`);

    try {
      await waitForAuthenticatedLanding(page);
    } catch {
      if (!(await tryLogin(page, fallbackEmail, password))) {
        const errorAlert = page
          .locator('[data-testid="login-error"]')
          .or(page.locator('.alert.alert-error[role="alert"]'));
        if (await errorAlert.first().isVisible()) {
          const errorText = await errorAlert.first().textContent();
          throw new Error(`Login failed with error: ${errorText}`);
        }
        throw new Error('Login navigation timed out without error message');
      }
    }
  }

  // Save authentication state
  await page.context().storageState({ path: 'e2e/.auth/user.json' });
});
