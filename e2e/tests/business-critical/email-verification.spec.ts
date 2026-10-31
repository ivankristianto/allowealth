import { test, expect, type APIRequestContext } from '@playwright/test';
import {
  createVerificationToken,
  createExpiredVerificationToken,
  isUserVerified,
  getWorkspaceStatus,
} from '../../helpers/email-verification';

/**
 * Email Verification E2E Tests
 *
 * Covers the login page banners and the /api/auth/verify-email endpoint.
 * Since the Better Auth migration, signup no longer issues verification
 * tokens or blocks unverified logins, so these tests insert tokens directly.
 *
 * These tests run WITHOUT authentication (unauthenticated browser context).
 */

const E2E_BASE_URL = 'http://localhost:4320';
const E2E_CAPTCHA_TOKEN = process.env.E2E_TURNSTILE_TOKEN;

// Use unauthenticated browser context for all tests in this file
test.use({ storageState: { cookies: [], origins: [] } });

let testEmailCounter = 0;

/** Generate a unique email for each test to prevent collisions */
function uniqueEmail(): string {
  return `e2e-verify-${Date.now()}-${testEmailCounter++}@test.com`;
}

/** Register a user via the signup API and return the email */
async function registerUser(
  request: APIRequestContext,
  overrides?: { email?: string; password?: string; name?: string }
): Promise<{ email: string; password: string }> {
  const email = overrides?.email ?? uniqueEmail();
  const password = overrides?.password ?? 'TestPassword123!';
  const name = overrides?.name ?? 'E2E Verify User';

  const response = await request.post(`${E2E_BASE_URL}/api/auth/sign-up/email`, {
    headers: E2E_CAPTCHA_TOKEN ? { 'x-captcha-response': E2E_CAPTCHA_TOKEN } : {},
    data: { email, password, name, callbackURL: '/dashboard' },
  });

  expect(response.ok()).toBe(true);
  return { email, password };
}

test.describe('Email Verification', () => {
  test.describe('Login Page Banners', () => {
    test('shows registration info banner when registered=true', async ({ page }) => {
      await page.goto('/login?registered=true');
      const banner = page.locator('.alert-info');
      await expect(banner).toBeVisible();
      await expect(banner).toContainText('Check your email to verify your account');
    });

    test('shows verification success banner when verified=true', async ({ page }) => {
      await page.goto('/login?verified=true');
      const banner = page.locator('.alert-success');
      await expect(banner).toBeVisible();
      await expect(banner).toContainText('Email verified');
    });

    test('shows invalid token error message', async ({ page }) => {
      await page.goto('/login?error=invalid_token');
      const errorArea = page.locator('[data-testid="login-error"]');
      await expect(errorArea).toContainText('Invalid verification link');
    });

    test('shows expired token error message', async ({ page }) => {
      await page.goto('/login?error=expired_token');
      // expired_token shows as a banner (with resend button), not inline error
      const banner = page.locator('.alert-error');
      await expect(banner).toContainText('expired');
    });
  });

  test.describe('Verify Email Endpoint', () => {
    test('missing token redirects to login with invalid_token error', async ({ page }) => {
      await page.goto(`${E2E_BASE_URL}/api/auth/verify-email`);
      await page.waitForURL('**/login**');
      expect(page.url()).toContain('error=invalid_token');
    });

    test('invalid token redirects to login with invalid_token error', async ({ page }) => {
      await page.goto(`${E2E_BASE_URL}/api/auth/verify-email?token=nonexistent-token-xyz`);
      await page.waitForURL('**/login**');
      expect(page.url()).toContain('error=invalid_token');
    });
  });

  test.describe('Token Verification', () => {
    test('register, verify via token, then login successfully', async ({ page, request }) => {
      const { email, password } = await registerUser(request);
      expect(isUserVerified(email)).toBe(false);

      const token = createVerificationToken(email);
      expect(token).not.toBeNull();

      await page.goto(`${E2E_BASE_URL}/api/auth/verify-email?token=${token}`);
      await page.waitForURL('**/login**');
      expect(page.url()).toContain('verified=true');

      expect(isUserVerified(email)).toBe(true);
      expect(getWorkspaceStatus(email)).toBe('active');

      await page.fill('[data-testid="email-input"]', email);
      await page.fill('[data-testid="password-input"]', password);
      await page.click('[data-testid="login-btn"]');
      await expect
        .poll(() => new URL(page.url()).pathname, { timeout: 15000 })
        .toMatch(/^\/(dashboard|onboarding)$/);
    });

    test('expired token redirects with expired_token error', async ({ page, request }) => {
      const { email } = await registerUser(request);

      const token = createExpiredVerificationToken(email);
      expect(token).not.toBeNull();

      await page.goto(`${E2E_BASE_URL}/api/auth/verify-email?token=${token}`);
      await page.waitForURL('**/login**');
      expect(page.url()).toContain('error=expired_token');
      expect(page.url()).toContain(`email=${encodeURIComponent(email)}`);
    });
  });
});
