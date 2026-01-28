import { Page, APIRequestContext } from '@playwright/test';

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
 * Example usage in tests:
 *   const { id } = await createTransactionViaAPI(page.request, {...});
 *
 * @TODO: P2 - Consider adding explicit auth token parameter for standalone API testing
 */

const E2E_BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4320';

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
    assetId: string;
    date?: string;
    description?: string;
  }
): Promise<{ id: string }> {
  const response = await request.post(`${E2E_BASE_URL}/api/transactions`, {
    data: {
      type: data.type,
      amount: data.amount,
      categoryId: data.categoryId,
      assetId: data.assetId,
      date: data.date || new Date().toISOString().split('T')[0],
      description: data.description || 'E2E Test Transaction',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create transaction: ${response.status()}`);
  }

  return response.json();
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
    data: {
      name: data.name,
      type: data.type,
      icon: data.icon || 'circle',
      color: data.color || '#6366f1',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create category: ${response.status()}`);
  }

  return response.json();
}

/**
 * Create an asset via API for test setup.
 * @param request - Playwright API request context
 * @param data - Asset data to create
 */
export async function createAssetViaAPI(
  request: APIRequestContext,
  data: {
    name: string;
    type: 'cash' | 'bank' | 'investment' | 'other';
    balance: number;
    currency?: string;
  }
): Promise<{ id: string }> {
  const response = await request.post(`${E2E_BASE_URL}/api/assets`, {
    data: {
      name: data.name,
      type: data.type,
      balance: data.balance,
      currency: data.currency || 'IDR',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create asset: ${response.status()}`);
  }

  return response.json();
}

/**
 * Set a budget for a category via API.
 * @param request - Playwright API request context
 * @param categoryId - Category ID to set budget for
 * @param amount - Budget amount
 * @param month - Month in YYYY-MM format (defaults to current month)
 */
export async function setBudgetViaAPI(
  request: APIRequestContext,
  categoryId: string,
  amount: number,
  month?: string
): Promise<void> {
  const currentMonth = month || new Date().toISOString().slice(0, 7);

  const response = await request.post(`${E2E_BASE_URL}/api/budget`, {
    data: {
      categoryId,
      amount,
      month: currentMonth,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to set budget: ${response.status()}`);
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
  const response = await request.delete(`${E2E_BASE_URL}/api/transactions/${transactionId}`);

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
  const response = await request.delete(`${E2E_BASE_URL}/api/categories/${categoryId}`);

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

  return response.json();
}

/**
 * Get all assets via API.
 * @param request - Playwright API request context
 */
export async function getAssetsViaAPI(
  request: APIRequestContext
): Promise<Array<{ id: string; name: string; balance: number }>> {
  const response = await request.get(`${E2E_BASE_URL}/api/assets`);

  if (!response.ok()) {
    throw new Error(`Failed to get assets: ${response.status()}`);
  }

  return response.json();
}

/**
 * Wait for API to be ready.
 * Useful at the start of tests to ensure the server is responsive.
 * @param page - Playwright page
 * @param timeout - Maximum wait time in milliseconds
 */
export async function waitForAPIReady(page: Page, timeout: number = 30000): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await page.request.get(`${E2E_BASE_URL}/api/health`);
      if (response.ok()) {
        return;
      }
    } catch {
      // API not ready yet, continue waiting
    }
    await page.waitForTimeout(500);
  }

  throw new Error(`API not ready after ${timeout}ms`);
}
