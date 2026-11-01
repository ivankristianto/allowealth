import { test, expect } from './test.fixture';
import type { Locator, Page } from '@playwright/test';
import {
  TEST_AMOUNTS,
  generateTestId,
  createAccountViaAPI,
  createCategoryViaAPI,
  createTransactionViaAPI,
  setBudgetViaAPI,
} from '../helpers';

interface NamedRecord {
  id: string;
  name: string;
}

const today = () => new Date().toISOString().split('T')[0];

function transactionCard(page: Page, title: string): Locator {
  return page.locator('[data-transaction-card]', { hasText: title });
}

async function openTransactionMenu(card: Locator): Promise<void> {
  await card.locator('[aria-label="Transaction actions"]:visible').click();
}

// Every test works on categories and an account this file creates, so the seed's names and
// order don't matter.
test.describe('Money flows', () => {
  let expenseCategory: NamedRecord;
  let incomeCategory: NamedRecord;
  let account: NamedRecord;

  test.beforeAll(async ({ request }) => {
    const runId = generateTestId();
    const names = {
      expense: `E2E Spend ${runId}`,
      income: `E2E Earn ${runId}`,
      account: `E2E Wallet ${runId}`,
    };

    expenseCategory = {
      name: names.expense,
      ...(await createCategoryViaAPI(request, { name: names.expense, type: 'expense' })),
    };
    incomeCategory = {
      name: names.income,
      ...(await createCategoryViaAPI(request, { name: names.income, type: 'income' })),
    };
    account = {
      name: names.account,
      ...(await createAccountViaAPI(request, {
        name: names.account,
        type: 'bank_account',
        balance: TEST_AMOUNTS.LARGE_INCOME,
      })),
    };
  });

  test('add an expense and see it on transactions, dashboard and reports @mobile', async ({
    page,
    dashboardPage,
    addTransactionPage,
    reportsPage,
  }) => {
    const title = `E2E Expense ${generateTestId()}`;
    const amount = TEST_AMOUNTS.MEDIUM_EXPENSE;

    await dashboardPage.gotoDashboard();
    const dashboardBefore = await dashboardPage.getTotalExpenses();
    await reportsPage.goto();
    const reportsBefore = await reportsPage.getTotalExpenses();

    await addTransactionPage.gotoAddTransaction('expense');
    await addTransactionPage.fillAndSubmit({
      type: 'expense',
      amount,
      categoryName: expenseCategory.name,
      accountName: account.name,
      description: title,
      date: today(),
    });

    await page.goto(`/transactions?type=expense&search=${encodeURIComponent(title)}`);
    await expect(transactionCard(page, title)).toBeVisible();

    await dashboardPage.gotoDashboard();
    expect(await dashboardPage.getTotalExpenses()).toBe(dashboardBefore + amount);

    await reportsPage.goto();
    expect(await reportsPage.getTotalExpenses()).toBe(reportsBefore + amount);
  });

  test('edit an expense, then delete it', async ({ page, request }) => {
    const title = `E2E Edit ${generateTestId()}`;
    const editedTitle = `${title} edited`;
    await createTransactionViaAPI(request, {
      type: 'expense',
      amount: TEST_AMOUNTS.SMALL_EXPENSE,
      categoryId: expenseCategory.id,
      accountId: account.id,
      description: title,
    });

    await page.goto(`/transactions?type=expense&search=${encodeURIComponent(title)}`);
    const card = transactionCard(page, title);
    await openTransactionMenu(card);
    await card.locator('[data-edit-transaction]:visible').click();

    const form = page.locator('#transaction-drawer [data-testid="transaction-form"]:visible');
    await expect(form).toBeVisible();
    await form.locator('[data-testid="transaction-description-input"]').fill(editedTitle);
    await form
      .locator('[data-testid="transaction-amount-input"]')
      .fill(String(TEST_AMOUNTS.MEDIUM_EXPENSE));
    const [updateResponse] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/api/transactions/') && resp.request().method() === 'PUT'
      ),
      form.locator('[data-testid="transaction-submit-btn"]').click(),
    ]);
    expect(updateResponse.ok()).toBe(true);

    await page.goto(`/transactions?type=expense&search=${encodeURIComponent(editedTitle)}`);
    const editedCard = transactionCard(page, editedTitle);
    await expect(editedCard).toContainText(
      new Intl.NumberFormat('id-ID').format(TEST_AMOUNTS.MEDIUM_EXPENSE)
    );

    await openTransactionMenu(editedCard);
    await editedCard.locator('[data-delete-transaction]:visible').click();
    await expect(page.locator('#delete-dialog[open]')).toBeVisible();
    const [deleteResponse] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/api/transactions/') && resp.request().method() === 'DELETE'
      ),
      page.getByTestId('confirm-delete-btn').click(),
    ]);
    expect(deleteResponse.ok()).toBe(true);

    await page.reload();
    await expect(transactionCard(page, editedTitle)).toHaveCount(0);
  });

  test('add an income', async ({ page, addTransactionPage }) => {
    const title = `E2E Income ${generateTestId()}`;

    await addTransactionPage.gotoAddTransaction('income');
    await addTransactionPage.fillAndSubmit({
      type: 'income',
      amount: TEST_AMOUNTS.MEDIUM_INCOME,
      categoryName: incomeCategory.name,
      accountName: account.name,
      description: title,
      date: today(),
    });

    await page.goto(`/transactions?type=income&search=${encodeURIComponent(title)}`);
    await expect(transactionCard(page, title)).toContainText(
      new Intl.NumberFormat('id-ID').format(TEST_AMOUNTS.MEDIUM_INCOME)
    );
  });

  test('change a budget and see spending count against it', async ({ request, budgetPage }) => {
    const categoryName = `E2E Budget ${generateTestId()}`;
    const category = await createCategoryViaAPI(request, { name: categoryName, type: 'expense' });
    const budgetAmount = TEST_AMOUNTS.BUDGET_MEDIUM;
    const spent = TEST_AMOUNTS.MEDIUM_EXPENSE;

    // The budget page only renders a card for a category that already has a budget.
    await setBudgetViaAPI(request, category.id, TEST_AMOUNTS.BUDGET_SMALL);

    await budgetPage.gotoBudget();
    await budgetPage.setBudget(category.id, budgetAmount);
    await budgetPage.expectBudgetSet(category.id, budgetAmount);

    await createTransactionViaAPI(request, {
      type: 'expense',
      amount: spent,
      categoryId: category.id,
      accountId: account.id,
      description: `${categoryName} spend`,
    });

    await budgetPage.gotoBudget();
    await budgetPage.expectCategorySpent(category.id, spent);
    await budgetPage.expectCategoryPercentage(
      category.id,
      Math.round((spent / budgetAmount) * 100)
    );
    await budgetPage.expectBudgetSet(category.id, budgetAmount);
  });
});
