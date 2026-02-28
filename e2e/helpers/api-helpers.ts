import { Page, APIRequestContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * API helper functions for E2E test setup and teardown.
 * These helpers interact directly with API endpoints to set up test data.
 *
 * IMPORTANT: Authentication Context
 * ---------------------------------
 * These functions require an authenticated APIRequestContext. When using with
 * Playwright tests, pass `page.request` (inherits browser cookies) rather than
 * a standalone `request` fixture. The global-setup.ts saves auth state to
 * e2e/.auth/user.json which is loaded by test projects.
 *
 * CSRF Protection:
 * ----------------
 * All state-changing requests (POST, PUT, DELETE) require a CSRF token header.
 * The token is extracted from the storage state file and included automatically.
 *
 * Example usage in tests:
 *   const { id } = await createTransactionViaAPI(page.request, {...});
 */

const E2E_BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4320';
const AUTH_STATE_PATH = path.resolve(process.cwd(), 'e2e/.auth/user.json');

/**
 * CSRF token header name (must match src/lib/csrf.ts)
 */
const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * CSRF cookie name (must match src/lib/csrf.ts)
 */
const CSRF_COOKIE_NAME = 'csrf_token';

/**
 * Cache for the CSRF token to avoid repeated file reads
 */
let cachedCsrfToken: string | null = null;

/**
 * Get the CSRF token from the storage state file.
 * The token is cached after first read for performance.
 * @returns CSRF token string
 */
function getCsrfToken(): string {
  if (cachedCsrfToken) {
    return cachedCsrfToken;
  }

  try {
    const storageState = JSON.parse(fs.readFileSync(AUTH_STATE_PATH, 'utf-8'));
    const csrfCookie = storageState.cookies?.find(
      (cookie: { name: string; value: string }) => cookie.name === CSRF_COOKIE_NAME
    );

    if (!csrfCookie?.value) {
      throw new Error(`CSRF cookie not found in storage state file: ${AUTH_STATE_PATH}`);
    }

    // Decode URL-encoded token
    cachedCsrfToken = decodeURIComponent(csrfCookie.value);
    return cachedCsrfToken;
  } catch (error) {
    if (error instanceof Error && error.message.includes('CSRF cookie not found')) {
      throw error;
    }
    throw new Error(
      `Failed to read CSRF token from storage state: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Clear the cached CSRF token (useful for tests that need fresh state)
 */
export function clearCsrfTokenCache(): void {
  cachedCsrfToken = null;
}

/**
 * Create a transaction via API for test setup.
 * @param request - Playwright API request context
 * @param data - Transaction data to create
 */
export async function createTransactionViaAPI(
  request: APIRequestContext,
  data: {
    type: 'income' | 'expense';
    amount: number;
    categoryId: string;
    accountId: string;
    date?: string;
    currency?: Currency;
    description?: string;
  }
): Promise<{ id: string }> {
  const response = await request.post(`${E2E_BASE_URL}/api/transactions`, {
    headers: {
      [CSRF_HEADER_NAME]: getCsrfToken(),
    },
    data: {
      type: data.type,
      // API expects amount as string
      amount: data.amount.toString(),
      currency: data.currency || 'IDR',
      // API uses snake_case field names
      category_id: data.categoryId,
      account_id: data.accountId,
      transaction_date: data.date || new Date().toISOString().split('T')[0],
      description: data.description || 'E2E Test Transaction',
    },
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Failed to create transaction: ${response.status()} - ${errorBody}`);
  }

  // API returns { success: true, data: {...} }, extract the data
  const result = await response.json();
  return result.data;
}

/**
 * Create a category via API for test setup.
 * @param request - Playwright API request context
 * @param data - Category data to create
 */
export async function createCategoryViaAPI(
  request: APIRequestContext,
  data: {
    name: string;
    type: 'income' | 'expense';
    icon?: string;
    color?: string;
  }
): Promise<{ id: string }> {
  const response = await request.post(`${E2E_BASE_URL}/api/categories`, {
    headers: {
      [CSRF_HEADER_NAME]: getCsrfToken(),
    },
    data: {
      name: data.name,
      type: data.type,
      icon: data.icon || 'circle',
      color: data.color || '#15803d',
    },
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Failed to create category: ${response.status()} - ${errorBody}`);
  }

  // API returns { success: true, data: {...} }, extract the data
  const result = await response.json();
  return result.data;
}

/**
 * Create an account via API for test setup.
 * @param request - Playwright API request context
 * @param data - Account data to create
 */
/**
 * Valid account types (must match src/lib/types/account.ts AccountType)
 */
type AccountType =
  | 'cash'
  | 'bank_account'
  | 'e_wallet'
  | 'mutual_fund'
  | 'bond'
  | 'crypto'
  | 'stock'
  | 'other'
  | 'credit_card'
  | 'loan';

export async function createAccountViaAPI(
  request: APIRequestContext,
  data: {
    name: string;
    type: AccountType;
    balance: number;
    currency?: Currency;
  }
): Promise<{ id: string }> {
  const response = await request.post(`${E2E_BASE_URL}/api/accounts`, {
    headers: {
      [CSRF_HEADER_NAME]: getCsrfToken(),
    },
    data: {
      name: data.name,
      type: data.type,
      // API expects balance as string with optional decimal places
      balance: data.balance.toString(),
      currency: data.currency || 'IDR',
    },
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Failed to create account: ${response.status()} - ${errorBody}`);
  }

  // API returns { success: true, data: {...} }, extract the data
  const result = await response.json();
  return result.data;
}

/**
 * Set a budget for a category via API.
 * If a budget already exists for the category/month/year/currency, it will be updated.
 * Otherwise, a new budget will be created.
 * @param request - Playwright API request context
 * @param categoryId - Category ID to set budget for
 * @param amount - Budget amount
 * @param currency - Currency code (IDR or USD), defaults to IDR
 * @param month - Month (1-12), defaults to current month
 * @param year - Year (2000-2100), defaults to current year
 */
export async function setBudgetViaAPI(
  request: APIRequestContext,
  categoryId: string,
  amount: number,
  currency: Currency = 'IDR',
  month?: number,
  year?: number
): Promise<void> {
  const now = new Date();
  const currentMonth = month ?? now.getMonth() + 1; // getMonth() is 0-indexed
  const currentYear = year ?? now.getFullYear();

  const budgetData = {
    category_id: categoryId,
    budget_amount: amount.toString(),
    month: currentMonth,
    year: currentYear,
    currency: currency,
    notes: '',
  };

  // First, try to get existing budgets for this month/year
  const getBudgetsResponse = await request.get(
    `${E2E_BASE_URL}/api/budgets?month=${currentMonth}&year=${currentYear}&currency=${currency}`,
    {
      headers: {
        [CSRF_HEADER_NAME]: getCsrfToken(),
      },
    }
  );

  if (getBudgetsResponse.ok()) {
    const result = await getBudgetsResponse.json();
    const budgets = result.data;
    // Find if there's an existing budget for this category
    const existingBudget = budgets.find((b: any) => b.category_id === categoryId);

    if (existingBudget) {
      // Update existing budget
      const updateResponse = await request.put(`${E2E_BASE_URL}/api/budgets/${existingBudget.id}`, {
        headers: {
          [CSRF_HEADER_NAME]: getCsrfToken(),
        },
        data: budgetData,
      });

      if (!updateResponse.ok()) {
        const errorText = await updateResponse.text();
        throw new Error(`Failed to update budget: ${updateResponse.status()} - ${errorText}`);
      }
      return;
    }
  }

  // Create new budget if none exists
  const createResponse = await request.post(`${E2E_BASE_URL}/api/budgets`, {
    headers: {
      [CSRF_HEADER_NAME]: getCsrfToken(),
    },
    data: budgetData,
  });

  if (!createResponse.ok()) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create budget: ${createResponse.status()} - ${errorText}`);
  }
}

/**
 * Delete a transaction via API for test cleanup.
 * @param request - Playwright API request context
 * @param transactionId - Transaction ID to delete
 */
export async function deleteTransactionViaAPI(
  request: APIRequestContext,
  transactionId: string
): Promise<void> {
  const response = await request.delete(`${E2E_BASE_URL}/api/transactions/${transactionId}`, {
    headers: {
      [CSRF_HEADER_NAME]: getCsrfToken(),
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to delete transaction: ${response.status()}`);
  }
}

/**
 * Delete a category via API for test cleanup.
 * @param request - Playwright API request context
 * @param categoryId - Category ID to delete
 */
export async function deleteCategoryViaAPI(
  request: APIRequestContext,
  categoryId: string
): Promise<void> {
  const response = await request.delete(`${E2E_BASE_URL}/api/categories/${categoryId}`, {
    headers: {
      [CSRF_HEADER_NAME]: getCsrfToken(),
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to delete category: ${response.status()}`);
  }
}

/**
 * Get all categories via API.
 * @param request - Playwright API request context
 * @param type - Optional filter by category type
 */
export async function getCategoriesViaAPI(
  request: APIRequestContext,
  type?: 'income' | 'expense'
): Promise<Array<{ id: string; name: string; type: string }>> {
  const url = type
    ? `${E2E_BASE_URL}/api/categories?type=${type}`
    : `${E2E_BASE_URL}/api/categories`;

  const response = await request.get(url);

  if (!response.ok()) {
    throw new Error(`Failed to get categories: ${response.status()}`);
  }

  // API returns { success: true, data: [...] }, extract the data
  const result = await response.json();
  return result.data;
}

/**
 * Get all accounts via API.
 * @param request - Playwright API request context
 */
export async function getAccountsViaAPI(request: APIRequestContext): Promise<TestAccount[]> {
  const response = await request.get(`${E2E_BASE_URL}/api/accounts`);

  if (!response.ok()) {
    throw new Error(`Failed to get accounts: ${response.status()}`);
  }

  // API returns { success: true, data: [...] }, extract the data
  const result = await response.json();
  return (result.data as Array<Record<string, unknown>>).map((account) => ({
    id: String(account.id),
    name: String(account.name),
    type: String(account.type || ''),
    account_class: String(account.account_class || ''),
    currency: String(account.currency || 'IDR'),
    balance: Number(account.balance || 0),
  }));
}

/**
 * Wait for API to be ready.
 * Useful at the start of tests to ensure the server is responsive.
 * @param page - Playwright page
 * @param timeout - Maximum wait time in milliseconds
 */
export async function waitForAPIReady(page: Page, timeout: number = 30000): Promise<void> {
  const { expect } = await import('@playwright/test');

  await expect
    .poll(
      async () => {
        try {
          const response = await page.request.get(`${E2E_BASE_URL}/api/health`);
          return response.ok();
        } catch {
          return false;
        }
      },
      { timeout, intervals: [100, 250, 500, 1000], message: `API not ready after ${timeout}ms` }
    )
    .toBe(true);
}

/**
 * Category and Account type definitions for test data helpers
 */
export interface TestCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

export interface TestAccount {
  id: string;
  name: string;
  type: string;
  account_class: string;
  currency: string;
  balance: number;
}

/**
 * Get seeded test data from the database.
 * Returns categories and accounts that were created by the seeder.
 * This ensures tests use actual database data instead of hardcoded values.
 *
 * @param request - Playwright API request context
 * @returns Object containing arrays of income categories, expense categories, and accounts
 */
export async function getSeededTestData(request: APIRequestContext): Promise<{
  incomeCategories: TestCategory[];
  expenseCategories: TestCategory[];
  accounts: TestAccount[];
}> {
  const [incomeCategories, expenseCategories, accounts] = await Promise.all([
    getCategoriesViaAPI(request, 'income'),
    getCategoriesViaAPI(request, 'expense'),
    getAccountsViaAPI(request),
  ]);

  // Transaction form visibility rules:
  // - income form allows only liquid accounts
  // - transactions page defaults to IDR currency filter
  // Prefer IDR liquid accounts to keep add-* specs deterministic.
  const idrLiquidAccounts = accounts.filter(
    (account) => account.account_class === 'liquid' && account.currency === 'IDR'
  );
  const liquidAccounts = accounts.filter((account) => account.account_class === 'liquid');
  const transactionSafeAccounts =
    idrLiquidAccounts.length > 0
      ? idrLiquidAccounts
      : liquidAccounts.length > 0
        ? liquidAccounts
        : accounts;

  return {
    incomeCategories: incomeCategories as TestCategory[],
    expenseCategories: expenseCategories as TestCategory[],
    accounts: transactionSafeAccounts,
  };
}

/**
 * Get a random item from an array.
 * Useful for selecting random categories/accounts in tests.
 */
export function getRandomItem<T>(items: T[]): T {
  if (items.length === 0) {
    throw new Error('Cannot get random item from empty array');
  }
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Get the first category of a specific type.
 * Falls back to creating one if none exists.
 *
 * @param request - Playwright API request context
 * @param type - Category type ('income' or 'expense')
 * @returns Category object with id and name
 */
export async function getFirstCategory(
  request: APIRequestContext,
  type: 'income' | 'expense'
): Promise<TestCategory> {
  const categories = await getCategoriesViaAPI(request, type);

  if (categories.length === 0) {
    // Create a default category if none exists
    const created = await createCategoryViaAPI(request, {
      name: `E2E-${type}-${Date.now()}`,
      type,
    });
    return { id: created.id, name: `E2E-${type}-${Date.now()}`, type };
  }

  return categories[0] as TestCategory;
}

/**
 * Get the first account.
 * Falls back to creating one if none exists.
 *
 * @param request - Playwright API request context
 * @returns Account object with id and name
 */
export async function getFirstAccount(request: APIRequestContext): Promise<TestAccount> {
  const accounts = await getAccountsViaAPI(request);

  if (accounts.length === 0) {
    // Create a default account if none exists
    const created = await createAccountViaAPI(request, {
      name: `E2E-Cash-${Date.now()}`,
      type: 'cash',
      balance: 10000000,
    });
    return {
      id: created.id,
      name: `E2E-Cash-${Date.now()}`,
      type: 'cash',
      account_class: 'liquid',
      currency: 'IDR',
      balance: 10000000,
    };
  }

  const preferredAccount =
    accounts.find((account) => account.account_class === 'liquid' && account.currency === 'IDR') ||
    accounts.find((account) => account.account_class === 'liquid') ||
    accounts[0];

  return preferredAccount;
}
