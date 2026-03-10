import { test, expect, type APIRequestContext } from '@playwright/test';
import { execFileSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const E2E_BASE_URL = 'http://localhost:4320';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const E2E_DB_PATH = path.join(PROJECT_ROOT, 'db', '.e2e.db');

let testEmailCounter = 0;

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${testEmailCounter++}@test.com`;
}

async function registerUser(
  request: APIRequestContext,
  overrides?: { email?: string; password?: string; name?: string }
): Promise<{ email: string; password: string; name: string }> {
  const email = overrides?.email ?? uniqueEmail('e2e-auth');
  const password = overrides?.password ?? 'TestPassword123!';
  const name = overrides?.name ?? 'E2E Auth User';

  const response = await request.post(`${E2E_BASE_URL}/api/auth/sign-up/email`, {
    data: {
      email,
      password,
      name,
      callbackURL: '/dashboard',
    },
  });

  expect(response.ok()).toBe(true);

  return { email, password, name };
}

async function loginViaPage(
  page: import('@playwright/test').Page,
  email: string,
  password: string
) {
  await page.goto('/login');
  await submitLoginForm(page, email, password);
}

async function submitLoginForm(
  page: import('@playwright/test').Page,
  email: string,
  password: string
) {
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-btn"]');
}

async function browserPost<T>(
  page: import('@playwright/test').Page,
  path: string,
  body?: Record<string, unknown>
): Promise<{ ok: boolean; status: number; json: T | null }> {
  return page.evaluate(
    async ({ requestPath, requestBody }) => {
      const response = await fetch(requestPath, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody ? JSON.stringify(requestBody) : undefined,
      });

      const text = await response.text();

      return {
        ok: response.ok,
        status: response.status,
        json: text ? JSON.parse(text) : null,
      };
    },
    { requestPath: path, requestBody: body ?? null }
  );
}

function getPasswordResetToken(email: string): string | null {
  const sqliteScript = `
    import { Database } from 'bun:sqlite';
    const db = new Database(${JSON.stringify(E2E_DB_PATH)}, { readonly: true });
    const row = db.prepare(
      \`SELECT REPLACE(v.identifier, 'reset-password:', '') AS token
       FROM verification v
       JOIN user u ON v.value = u.id
       WHERE u.email = ?
         AND v.identifier LIKE 'reset-password:%'
       ORDER BY v.createdAt DESC
       LIMIT 1\`
    ).get(${JSON.stringify(email.toLowerCase())});
    db.close();
    console.log(JSON.stringify({ token: row?.token ?? null }));
  `;

  const output = execFileSync('bun', ['-e', sqliteScript], {
    cwd: PROJECT_ROOT,
    encoding: 'utf-8',
  }).trim();

  return JSON.parse(output).token ?? null;
}

function markUserTwoFactorEnabled(email: string): void {
  const sqliteScript = `
    import { Database } from 'bun:sqlite';
    const db = new Database(${JSON.stringify(E2E_DB_PATH)});
    const user = db
      .prepare('SELECT id FROM user WHERE email = ? LIMIT 1')
      .get(${JSON.stringify(email.toLowerCase())}) as { id?: string } | undefined;

    if (!user?.id) {
      throw new Error('User not found for 2FA setup');
    }

    db.prepare('UPDATE user SET twoFactorEnabled = 1 WHERE id = ?').run(user.id);
    db.close();
  `;

  execFileSync('bun', ['-e', sqliteScript], {
    cwd: PROJECT_ROOT,
    encoding: 'utf-8',
  });
}

test.describe('auth core', () => {
  test.describe('signed out flows', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('email/password login success', async ({ page, request }) => {
      const { email, password } = await registerUser(request);

      await loginViaPage(page, email, password);

      await expect
        .poll(() => new URL(page.url()).pathname, { timeout: 15000 })
        .toMatch(/^\/(dashboard|onboarding)$/);
    });

    test('2FA-required login reaches the verification step', async ({ page, request }) => {
      const { email, password } = await registerUser(request);

      await loginViaPage(page, email, password);
      await expect
        .poll(() => new URL(page.url()).pathname, { timeout: 15000 })
        .toMatch(/^\/(dashboard|onboarding)$/);

      // Task 4 only needs to verify the Better Auth login branch when 2FA is already enabled.
      // Task 5 covers the interactive security-management flows that enable and verify 2FA.
      markUserTwoFactorEnabled(email);

      await page.context().clearCookies();
      await page.goto('/login');

      await submitLoginForm(page, email, password);
      await expect(page).toHaveURL(/\/login\/verify-mfa/, { timeout: 15000 });
    });

    test('forgot-password request succeeds', async ({ page, request }) => {
      const { email } = await registerUser(request);

      await page.goto('/forgot-password');
      await page.fill('#email', email);
      await page.click('#forgot-password-submit-button');

      await expect(page.locator('.alert-success')).toContainText(
        'If an account exists with this email'
      );
    });

    test('reset-password page loads and accepts a valid reset token flow', async ({
      page,
      request,
    }) => {
      const { email, password } = await registerUser(request);
      const nextPassword = `${password}-reset`;

      await page.goto('/forgot-password');
      const resetRequest = await browserPost<{ status: boolean; message: string }>(
        page,
        '/api/auth/request-password-reset',
        {
          email,
          redirectTo: '/reset-password',
        }
      );
      expect(resetRequest.ok).toBe(true);
      expect(resetRequest.json?.status).toBe(true);

      const token = getPasswordResetToken(email);
      expect(token).not.toBeNull();

      await page.goto(`/reset-password?token=${token}`);
      await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible();

      await page.fill('#password', nextPassword);
      await page.fill('#confirm-password', nextPassword);
      await page.click('#reset-password-submit-button');

      await expect(page).toHaveURL(/\/login\?password-reset=true/, { timeout: 15000 });
      await expect(page.locator('.alert-success')).toContainText('Password updated');

      await submitLoginForm(page, email, nextPassword);
      await expect
        .poll(() => new URL(page.url()).pathname, { timeout: 15000 })
        .toMatch(/^\/(dashboard|onboarding)$/);
    });
  });

  test.describe('authenticated flows', () => {
    test('profile page still renders correctly when authenticated under the new session shape', async ({
      page,
    }) => {
      await page.goto('/profile');

      await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
      await expect(page.locator('#full-name')).toBeVisible();
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#password-change-form')).toBeVisible();
    });
  });
});
