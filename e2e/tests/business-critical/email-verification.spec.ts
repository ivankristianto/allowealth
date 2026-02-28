import { test, expect, type APIRequestContext } from '@playwright/test';
import {
  getVerificationToken,
  expireVerificationToken,
  isUserVerified,
  getWorkspaceStatus,
} from '../../helpers/email-verification';

/**
 * Email Verification E2E Tests
 *
 * Tests the complete email verification flow:
 * 1. Login page banners for various URL parameters
 * 2. Invalid/missing token handling
 * 3. Full registration → verification → login flow
 * 4. Unverified user login blocking
 * 5. Expired token handling
 * 6. Resend verification API
 *
 * These tests run WITHOUT authentication (unauthenticated browser context)
 * since they test the registration and pre-login flows.
 */

const E2E_BASE_URL = 'http://localhost:4320';

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

  const response = await request.post(`${E2E_BASE_URL}/api/auth/signup`, {
    data: { email, password, name },
  });

  expect(response.status()).toBe(201);
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

  test.describe('Full Verification Flow', () => {
    // Reset rate limits before this describe block to prevent 429 errors
    // when running across multiple Playwright projects (chromium + mobile-chrome)
    test.beforeAll(async ({ request }) => {
      await request.post(`${E2E_BASE_URL}/api/auth/e2e-reset-rate-limits`);
    });

    test('register, verify via token, then login successfully', async ({ page, request }) => {
      // Step 1: Register a new user via API
      const { email, password } = await registerUser(request);

      // Step 2: Verify user is NOT verified in the database
      expect(isUserVerified(email)).toBe(false);

      // Step 3: Get verification token from the database
      const token = getVerificationToken(email);
      expect(token).not.toBeNull();

      // Step 4: Visit the verification URL
      await page.goto(`${E2E_BASE_URL}/api/auth/verify-email?token=${token}`);
      await page.waitForURL('**/login**');
      expect(page.url()).toContain('verified=true');

      // Step 5: Verify user is now verified in the database
      expect(isUserVerified(email)).toBe(true);

      // Step 6: Verify workspace was activated
      expect(getWorkspaceStatus(email)).toBe('active');

      // Step 7: Login with the verified user
      await page.fill('[data-testid="email-input"]', email);
      await page.fill('[data-testid="password-input"]', password);
      await page.click('[data-testid="login-btn"]');
      await expect
        .poll(() => new URL(page.url()).pathname, { timeout: 15000 })
        .toMatch(/^\/(dashboard|onboarding)$/);
    });

    test('login attempt with unverified user shows verification error', async ({
      page,
      request,
    }) => {
      // Register a new user (unverified)
      const { email, password } = await registerUser(request);

      // Attempt to login
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', email);
      await page.fill('[data-testid="password-input"]', password);
      await page.click('[data-testid="login-btn"]');

      // Should show verification error with resend button
      const messagesArea = page.locator('#login-messages');
      await expect(messagesArea).toContainText('verify your email', { timeout: 10000 });
      await expect(page.locator('button[data-resend-email]')).toBeVisible();
    });

    test('expired token redirects with expired_token error', async ({ page, request }) => {
      // Register a new user
      const { email } = await registerUser(request);

      // Get token and expire it
      const token = getVerificationToken(email);
      expect(token).not.toBeNull();
      expireVerificationToken(email);

      // Visit verification URL with expired token
      await page.goto(`${E2E_BASE_URL}/api/auth/verify-email?token=${token}`);
      await page.waitForURL('**/login**');
      expect(page.url()).toContain('error=expired_token');
      expect(page.url()).toContain('email=');
    });

    test('resend verification email returns success', async ({ request }) => {
      // Register a new user
      const { email } = await registerUser(request);

      // Resend verification email via API
      const resendResponse = await request.post(`${E2E_BASE_URL}/api/auth/resend-verification`, {
        data: { email },
      });
      expect(resendResponse.status()).toBe(200);
      const body = await resendResponse.json();
      expect(body.message).toBeDefined();
    });

    test('resend verification for non-existent email returns generic response', async ({
      request,
    }) => {
      // Resend for non-existent email (should not reveal user existence)
      const resendResponse = await request.post(`${E2E_BASE_URL}/api/auth/resend-verification`, {
        data: { email: 'nonexistent-e2e@test.com' },
      });
      expect(resendResponse.status()).toBe(200);
      const body = await resendResponse.json();
      expect(body.message).toBeDefined();
    });
  });
});
