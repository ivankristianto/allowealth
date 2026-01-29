import { test as setup, expect } from '@playwright/test';
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
  await page.waitForURL('**/dashboard', { timeout: 10000 });

  // Save authentication state
  await page.context().storageState({ path: 'e2e/.auth/user.json' });
});
