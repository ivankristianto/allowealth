import type { APIRequestContext } from '@playwright/test';
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
      icon: data.icon || 'tag',
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
