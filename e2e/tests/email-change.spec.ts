import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import {
  createVerificationToken,
  createExpiredVerificationToken,
  getEmailState,
} from '../helpers/email-verification';

/**
 * Email Verification E2E Tests
 *
 * Covers the email-change flow and the /api/auth/verify-email endpoint.
 * Signup no longer issues verification tokens, so the live token flow is an
 * email change from the profile API. The app stores only the token hash and
 * emails the raw value, so tests insert their own token for the user.
 *
 * These tests start WITHOUT authentication (unauthenticated browser context).
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

async function loginViaForm(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-btn"]');
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 15000 })
    .toMatch(/^\/(dashboard|onboarding)$/);
}

/** The middleware sets csrf_token on authenticated page loads, URL-encoded. */
async function getCsrfTokenFromPage(page: Page): Promise<string> {
  const cookie = (await page.context().cookies()).find(({ name }) => name === 'csrf_token');
  expect(cookie?.value).toBeTruthy();
  return decodeURIComponent(cookie!.value);
}

test.describe('Email Verification', () => {
  test.describe('Token Verification', () => {
    test('change email via profile, verify the token, then sign in with the new email', async ({
      page,
      request,
      browser,
    }) => {
      const { email: oldEmail, password } = await registerUser(request);
      const newEmail = uniqueEmail();

      await loginViaForm(page, oldEmail, password);

      const updateResponse = await page.request.put(`${E2E_BASE_URL}/api/user/profile`, {
        headers: { 'X-CSRF-Token': await getCsrfTokenFromPage(page) },
        data: { name: 'E2E Verify User', email: newEmail, phone: '' },
      });
      expect(updateResponse.ok()).toBe(true);
      expect((await updateResponse.json()).data.pendingEmail).toBe(newEmail);

      const before = getEmailState(oldEmail);
      expect(before).toMatchObject({
        email: oldEmail,
        authEmail: oldEmail,
        pendingEmail: newEmail,
      });

      const oldSession = await page.context().storageState();
      const profileBefore = await page.request.get(`${E2E_BASE_URL}/api/user/profile`);
      expect(profileBefore.status()).toBe(200);

      // users.email stays on the old address until the token is verified
      const token = createVerificationToken(oldEmail);
      expect(token).not.toBeNull();

      await page.goto(`${E2E_BASE_URL}/api/auth/verify-email?token=${token}`);
      await page.waitForURL('**/login**');
      expect(new URL(page.url()).searchParams.get('email-changed')).toBe('true');
      await expect(page.locator('.alert-success')).toContainText('Email changed successfully');

      expect(getEmailState(oldEmail)).toBeNull();
      expect(getEmailState(newEmail)).toEqual({
        userId: before!.userId,
        email: newEmail,
        authEmail: newEmail,
        pendingEmail: null,
      });

      const oldSessionContext = await browser.newContext({ storageState: oldSession });
      try {
        const profileAfter = await oldSessionContext.request.get(
          `${E2E_BASE_URL}/api/user/profile`
        );
        expect(profileAfter.status()).toBe(401);
      } finally {
        await oldSessionContext.close();
      }

      await loginViaForm(page, newEmail, password);
    });

    test('missing, unknown and expired tokens are rejected', async ({ page, request }) => {
      const verifyUrl = `${E2E_BASE_URL}/api/auth/verify-email`;

      await page.goto(verifyUrl);
      await page.waitForURL('**/login**');
      expect(new URL(page.url()).searchParams.get('error')).toBe('invalid_token');

      await page.goto(`${verifyUrl}?token=nonexistent-token-xyz`);
      await page.waitForURL('**/login**');
      expect(new URL(page.url()).searchParams.get('error')).toBe('invalid_token');

      const { email } = await registerUser(request);
      const token = createExpiredVerificationToken(email);
      expect(token).not.toBeNull();

      await page.goto(`${verifyUrl}?token=${token}`);
      await page.waitForURL('**/login**');
      const expiredUrl = new URL(page.url());
      expect(expiredUrl.searchParams.get('error')).toBe('expired_token');
      expect(expiredUrl.searchParams.get('email')).toBe(email);
    });
  });
});
