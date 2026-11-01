import { defineConfig, devices } from '@playwright/test';

// @TODO: P2 - Consider adding Firefox/WebKit projects for cross-browser testing
// The app mixes UTC and local dates (#428). Pin the runner, the dev server it spawns and the
// browser to one zone so a run near midnight or on the 1st can't land them on different days.
process.env.TZ = 'UTC';

const E2E_PORT = 4320;
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

/**
 * Playwright configuration for E2E testing.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Use 1 worker to prevent database race conditions between parallel tests
  // Tests share the same database, so parallel execution causes interference
  workers: 1,
  reporter: [
    ['html', { outputFolder: '../test-results/playwright-report' }],
    ['json', { outputFile: '../test-results/e2e-results.json' }],
  ],

  // Store test artifacts (screenshots, traces) in root test-results
  outputDir: '../test-results/artifacts',

  use: {
    baseURL: E2E_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    timezoneId: 'UTC',
  },

  webServer: {
    // Astro 7 backgrounds `astro dev` when it detects an AI agent, and Playwright
    // treats the exited launcher as a failed server. --ignore-lock keeps it in the foreground.
    command: 'bun run dev --ignore-lock',
    url: E2E_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      DATABASE_URL: 'db/.e2e.db',
      PORT: String(E2E_PORT),
      DEV_HOST: 'localhost', // Override to ensure server binds to localhost for E2E
      SIGNUP_MODE: 'public',
      E2E_USER_EMAIL: 'demo@example.com',
      E2E_USER_PASSWORD: 'demo123456789',
      // Tests that change a user's email trigger a send; never deliver real mail from E2E.
      EMAIL_PROVIDER: 'console',
    },
  },

  projects: [
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },
    {
      name: 'chromium',
      testMatch: /\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      testMatch: /\.spec\.ts$/,
      // Only the flows whose phone layout differs (sign-in, the add-transaction entry point).
      grep: /@mobile/,
      use: {
        ...devices['Pixel 5'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
