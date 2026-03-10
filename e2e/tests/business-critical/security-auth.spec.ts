import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { execFileSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const DEFAULT_PASSWORD = 'TestPassword123!';
const E2E_BASE_URL = 'http://localhost:4320';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const E2E_DB_PATH = path.join(PROJECT_ROOT, 'db', '.e2e.db');

let testEmailCounter = 0;

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${testEmailCounter++}@test.com`;
}

function runBunScript(script: string): string {
  return execFileSync('bun', ['-e', script], {
    cwd: PROJECT_ROOT,
    encoding: 'utf-8',
  }).trim();
}

async function registerUser(
  request: APIRequestContext,
  overrides?: { email?: string; password?: string; name?: string }
): Promise<{ email: string; password: string; name: string }> {
  const email = overrides?.email ?? uniqueEmail('e2e-security');
  const password = overrides?.password ?? DEFAULT_PASSWORD;
  const name = overrides?.name ?? 'E2E Security User';

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

async function submitLoginForm(page: Page, email: string, password: string) {
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-btn"]');
}

async function loginViaPage(page: Page, email: string, password: string) {
  await page.goto('/login');
  await submitLoginForm(page, email, password);
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 15000 })
    .toMatch(/^\/(dashboard|onboarding)$/);
}

function configureAuthState(
  email: string,
  options: {
    credentialAccount: boolean;
    googleLinked: boolean;
    twoFactorEnabled: boolean;
  }
): { userId: string; workspaceId: string } {
  const output = runBunScript(`
    import { Database } from 'bun:sqlite';

    const db = new Database(${JSON.stringify(E2E_DB_PATH)});
    const email = ${JSON.stringify(email.toLowerCase())};
    const state = ${JSON.stringify(options)};
    const now = Date.now();
    const authUser = db.prepare('SELECT id, email FROM user WHERE email = ? LIMIT 1').get(email);
    const domainUser = db.prepare('SELECT id, workspace_id FROM users WHERE email = ? LIMIT 1').get(email);

    if (!authUser?.id || !domainUser?.workspace_id) {
      throw new Error('Test user is missing from the Better Auth or domain tables');
    }

    const existingCredential = db
      .prepare("SELECT password FROM account WHERE userId = ? AND providerId = 'credential' LIMIT 1")
      .get(authUser.id);

    db.prepare('DELETE FROM account WHERE userId = ?').run(authUser.id);

    if (state.credentialAccount) {
      db.prepare(
        "INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt) VALUES (?, ?, 'credential', ?, ?, ?, ?)"
      ).run(
        'credential-' + authUser.id,
        authUser.email,
        authUser.id,
        existingCredential?.password ?? 'e2e-password-hash',
        now,
        now
      );
    }

    if (state.googleLinked) {
      db.prepare(
        "INSERT INTO account (id, accountId, providerId, userId, accessToken, createdAt, updatedAt) VALUES (?, ?, 'google', ?, 'e2e-google-access-token', ?, ?)"
      ).run('google-' + authUser.id, 'google-account-' + authUser.id, authUser.id, now, now);
    }

    db.prepare('UPDATE user SET twoFactorEnabled = ? WHERE id = ?').run(
      state.twoFactorEnabled ? 1 : 0,
      authUser.id
    );

    if (!state.twoFactorEnabled) {
      db.prepare('DELETE FROM twoFactor WHERE userId = ?').run(authUser.id);
    }

    db.close();
    console.log(JSON.stringify({ userId: authUser.id, workspaceId: domainUser.workspace_id }));
  `);

  return JSON.parse(output);
}

function ensureOnboardingCompleteForUser(email: string): void {
  runBunScript(`
    import { Database } from 'bun:sqlite';

    const db = new Database(${JSON.stringify(E2E_DB_PATH)});
    const email = ${JSON.stringify(email.toLowerCase())};
    const now = Date.now();
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const domainUser = db
      .prepare('SELECT id, workspace_id FROM users WHERE email = ? LIMIT 1')
      .get(email);

    if (!domainUser?.id || !domainUser?.workspace_id) {
      throw new Error('Test domain user not found');
    }

    const workspaceId = domainUser.workspace_id;
    const userId = domainUser.id;

    db.prepare(
      "DELETE FROM workspace_meta WHERE workspace_id = ? AND meta_key IN ('currency', 'monthly_income')"
    ).run(workspaceId);

    db.prepare(
      'INSERT INTO workspace_meta (id, workspace_id, meta_key, meta_value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('e2e-currency-' + workspaceId, workspaceId, 'currency', 'IDR', now, now);

    db.prepare(
      'INSERT INTO workspace_meta (id, workspace_id, meta_key, meta_value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      'e2e-monthly-income-' + workspaceId,
      workspaceId,
      'monthly_income',
      '10000000',
      now,
      now
    );

    let category = db
      .prepare(
        "SELECT id FROM budget_categories WHERE workspace_id = ? AND type = 'expense' AND is_active = 1 LIMIT 1"
      )
      .get(workspaceId);

    if (!category?.id) {
      category = { id: 'e2e-expense-category-' + workspaceId };
      db.prepare(
        "INSERT INTO budget_categories (id, workspace_id, created_by_user_id, name, type, income_source_type, icon, color, is_active, created_at, updated_at) VALUES (?, ?, ?, 'E2E Expenses', 'expense', 'other', 'tag', 'bg-neutral', 1, ?, ?)"
      ).run(category.id, workspaceId, userId, now, now);
    }

    let account = db
      .prepare('SELECT id FROM accounts WHERE workspace_id = ? AND deleted_at IS NULL LIMIT 1')
      .get(workspaceId);

    if (!account?.id) {
      account = { id: 'e2e-cash-account-' + workspaceId };
      db.prepare(
        "INSERT INTO accounts (id, workspace_id, created_by_user_id, name, type, account_class, balance, initial_balance, currency, is_cash_account, status, last_updated, created_at, updated_at) VALUES (?, ?, ?, 'E2E Wallet', 'cash', 'liquid', '500000', '500000', 'IDR', 1, 'active', ?, ?, ?)"
      ).run(account.id, workspaceId, userId, now, now, now);
    }

    const budget = db
      .prepare(
        'SELECT id FROM budgets WHERE workspace_id = ? AND category_id = ? AND month = ? AND year = ? AND currency = ? LIMIT 1'
      )
      .get(workspaceId, category.id, currentMonth, currentYear, 'IDR');

    if (!budget?.id) {
      db.prepare(
        "INSERT INTO budgets (id, workspace_id, created_by_user_id, category_id, month, year, budget_amount, currency, is_closed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, '2500000', 'IDR', 0, ?, ?)"
      ).run(
        'e2e-budget-' + workspaceId,
        workspaceId,
        userId,
        category.id,
        currentMonth,
        currentYear,
        now,
        now
      );
    }

    const transaction = db
      .prepare('SELECT id FROM transactions WHERE workspace_id = ? AND deleted_at IS NULL LIMIT 1')
      .get(workspaceId);

    if (!transaction?.id) {
      db.prepare(
        "INSERT INTO transactions (id, workspace_id, created_by_user_id, category_id, account_id, type, amount, currency, description, transaction_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'expense', '125000', 'IDR', 'E2E onboarding expense', ?, ?, ?)"
      ).run('e2e-transaction-' + workspaceId, workspaceId, userId, category.id, account.id, now, now, now);
    }

    db.close();
  `);
}

function generateCurrentMfaCode(email: string): string {
  return runBunScript(`
    import { Database } from 'bun:sqlite';
    import { symmetricDecrypt } from 'better-auth/crypto';
    import { createOTP } from '@better-auth/utils/otp';

    const db = new Database(${JSON.stringify(E2E_DB_PATH)});
    const email = ${JSON.stringify(email.toLowerCase())};
    const secretKey =
      process.env.BETTER_AUTH_SECRET ??
      process.env.SESSION_SECRET ??
      'better-auth-dev-secret-change-me';

    const row = db
      .prepare(
        'SELECT twoFactor.secret AS encryptedSecret FROM twoFactor INNER JOIN user ON user.id = twoFactor.userId WHERE lower(user.email) = ? LIMIT 1'
      )
      .get(email);

    if (!row?.encryptedSecret) {
      throw new Error('Encrypted two-factor secret not found for test user');
    }

    const secret = await symmetricDecrypt({
      key: secretKey,
      data: row.encryptedSecret,
    });

    const code = await createOTP(secret, { digits: 6, period: 30 }).totp();
    db.close();
    console.log(code);
  `);
}

async function resetMfaBannerDismissal(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.removeItem('mfa-banner-dismissed'));
}

test.describe('security auth', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('authenticated user can start Google linking and only sees unlink when it is safe', async ({
    page,
    request,
  }) => {
    const { email, password } = await registerUser(request);
    await loginViaPage(page, email, password);

    configureAuthState(email, {
      credentialAccount: true,
      googleLinked: false,
      twoFactorEnabled: false,
    });

    const linkRequests: string[] = [];
    await page.route('**/api/auth/link-social', async (route) => {
      linkRequests.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: '/security?google-link-started=true',
          redirect: true,
        }),
      });
    });

    await page.goto('/security');
    await page.getByTestId('connect-google-btn').click();

    await expect.poll(() => linkRequests.length).toBe(1);
    await expect(page).toHaveURL(/google-link-started=true/);

    configureAuthState(email, {
      credentialAccount: true,
      googleLinked: true,
      twoFactorEnabled: false,
    });

    await page.goto('/security');
    await expect(page.getByTestId('disconnect-google-btn')).toBeVisible();

    configureAuthState(email, {
      credentialAccount: false,
      googleLinked: true,
      twoFactorEnabled: false,
    });

    await page.goto('/security');
    await expect(page.getByTestId('disconnect-google-btn')).toHaveCount(0);
  });

  test('user can enable TOTP, view backup codes, and disable 2FA while dashboard and settings stay in sync', async ({
    page,
    request,
  }) => {
    const { email, password } = await registerUser(request);
    await loginViaPage(page, email, password);

    ensureOnboardingCompleteForUser(email);

    await page.goto('/dashboard');
    await resetMfaBannerDismissal(page);
    await page.reload();
    await expect(page.locator('[data-mfa-enable-banner]')).toBeVisible();

    await page.goto('/security');
    await page.getByTestId('enable-mfa-btn').click();
    await page.getByTestId('mfa-password-input').fill(password);
    await page.getByTestId('mfa-start-btn').click();

    const manualCode = page.locator('[data-manual-code]');
    await expect(manualCode).toBeVisible();

    const secret = (await manualCode.textContent())?.trim();
    expect(secret).toBeTruthy();

    await page.getByRole('button', { name: 'I have scanned this code' }).click();
    await expect(page.getByTestId('mfa-verification-input')).toBeVisible();
    await page.getByTestId('mfa-verification-input').fill(generateCurrentMfaCode(email));
    await page.getByTestId('mfa-verify-btn').click();

    const backupCodeItems = page.locator('[data-backup-codes-list] > div');
    await expect.poll(async () => await backupCodeItems.count()).toBeGreaterThan(0);
    await page.locator('[data-backup-codes-saved]').check();
    await page.locator('[data-close-backup-codes]').click();

    await expect(page.getByTestId('disable-mfa-btn')).toBeVisible();

    await page.goto('/settings');
    await page.getByRole('tab', { name: 'Members' }).click();
    const currentUserId = await page.locator('[data-settings-page]').getAttribute('data-user-id');
    expect(currentUserId).toBeTruthy();
    await expect(
      page.locator(
        `[data-member-item][data-member-id="${currentUserId}"] [aria-label="MFA enabled"]`
      )
    ).toBeVisible();

    await page.goto('/dashboard');
    await resetMfaBannerDismissal(page);
    await page.reload();
    await expect(page.locator('[data-mfa-enable-banner]')).toHaveCount(0);

    await page.goto('/security');
    await page.getByTestId('disable-mfa-btn').click();
    await page.getByTestId('mfa-password-confirm-input').fill(password);
    await page.getByTestId('mfa-confirm-submit').click();

    await expect(page.getByTestId('enable-mfa-btn')).toBeVisible();

    await page.goto('/settings');
    await page.getByRole('tab', { name: 'Members' }).click();
    await expect(
      page.locator(
        `[data-member-item][data-member-id="${currentUserId}"] [aria-label="MFA enabled"]`
      )
    ).toHaveCount(0);

    await page.goto('/dashboard');
    await resetMfaBannerDismissal(page);
    await page.reload();
    await expect(page.locator('[data-mfa-enable-banner]')).toBeVisible();
  });
});
