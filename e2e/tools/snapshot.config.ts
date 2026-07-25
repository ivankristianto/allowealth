import { defineConfig, devices } from '@playwright/test';

const E2E_PORT = 4320;
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

/**
 * Isolated config for the HTML snapshot tool. Kept separate from
 * e2e/playwright.config.ts so snapshot runs never overwrite E2E reports.
 */
export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: '../../test-results/snapshot-artifacts',

  use: {
    baseURL: E2E_BASE_URL,
    trace: 'off',
    screenshot: 'off',
  },

  webServer: {
    command: 'bun run dev',
    url: E2E_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      DATABASE_URL: 'db/.e2e.db',
      PORT: String(E2E_PORT),
      DEV_HOST: 'localhost',
      SIGNUP_MODE: 'public',
      E2E_USER_EMAIL: 'demo@example.com',
      E2E_USER_PASSWORD: 'demo123456789',
    },
  },

  projects: [
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
      testDir: '../tests',
    },
    {
      name: 'capture',
      testMatch: /capture\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
});
