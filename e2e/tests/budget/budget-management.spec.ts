import { test, expect } from '../test.fixture';
import { TEST_AMOUNTS } from '../../helpers';

test.describe('Budget Management', () => {
  test.beforeEach(async ({ budgetPage }) => {
    /**
     * Navigate to budget page before each test.
     * The test fixture ensures authentication is already completed.
     */
    await budgetPage.gotoBudget();
  });

  test('set and verify budget for category', async ({ budgetPage }) => {
    /**
     * Test scenario:
     * 1. Navigate to budget page
     * 2. Find a budget card for a category
     * 3. Set a budget amount
     * 4. Verify the budget is displayed correctly
     */

    // Define test data
    const budgetAmount = TEST_AMOUNTS.BUDGET_MEDIUM; // 1.5M IDR

    /**
     * Get first visible budget card to determine which category to work with.
     * This allows the test to work with any seeded data.
     */
    const budgetCards = await budgetPage.page.locator('[data-testid="budget-card"]');
    const cardCount = await budgetCards.count();

    expect(cardCount).toBeGreaterThan(0);

    /**
     * Extract category ID from the first budget card's data attribute.
     * The card structure is: <div data-testid="budget-card" data-category-id="...">
     */
    const firstCard = budgetCards.first();
    const categoryId = await firstCard.getAttribute('data-category-id');

    expect(categoryId).toBeTruthy();

    if (!categoryId) {
      throw new Error('Could not extract category ID from budget card');
    }

    // Set budget amount for the category
    await budgetPage.setBudget(categoryId, budgetAmount);

    // Verify budget is set and displayed correctly
    await budgetPage.expectBudgetSet(categoryId, budgetAmount);

    // Verify the budget card is visible
    await budgetPage.expectBudgetCardVisible(categoryId);
  });

  test('verify budget percentage calculation', async ({ budgetPage }) => {
    /**
     * Test scenario:
     * 1. Set a budget for a category
     * 2. Verify the percentage is displayed
     * 3. Verify percentage calculation (spent vs budget)
     *
     * Note: This test verifies the UI correctly displays percentages.
     * The percentage is calculated as: (spent / budget) * 100
     */

    const budgetAmount = TEST_AMOUNTS.BUDGET_LARGE; // 3M IDR

    // Get first budget card
    const budgetCards = await budgetPage.page.locator('[data-testid="budget-card"]');
    const firstCard = budgetCards.first();
    const categoryId = await firstCard.getAttribute('data-category-id');

    expect(categoryId).toBeTruthy();

    if (!categoryId) {
      throw new Error('Could not extract category ID from budget card');
    }

    // Set budget
    await budgetPage.setBudget(categoryId, budgetAmount);

    // Verify budget is set
    await budgetPage.expectBudgetSet(categoryId, budgetAmount);

    /**
     * Get current spent amount for the category.
     * This verifies the UI retrieves and displays the spent amount correctly.
     */
    const spentAmount = await budgetPage.getCategorySpent(categoryId);

    /**
     * Get percentage display value.
     * This verifies the percentage is calculated and displayed.
     */
    const percentage = await budgetPage.getCategoryPercentage(categoryId);

    /**
     * Verify percentage calculation is correct.
     * Expected percentage = (spent / budget) * 100
     */
    const expectedPercentage = Math.round((spentAmount / budgetAmount) * 100);

    expect(percentage).toBe(expectedPercentage);
  });

  test('verify spent amount display', async ({ budgetPage }) => {
    /**
     * Test scenario:
     * 1. Set a budget for a category
     * 2. Verify spent amount is displayed
     * 3. Verify spent amount formatting
     */

    const budgetAmount = TEST_AMOUNTS.BUDGET_SMALL; // 500k IDR

    // Get first budget card
    const budgetCards = await budgetPage.page.locator('[data-testid="budget-card"]');
    const firstCard = budgetCards.first();
    const categoryId = await firstCard.getAttribute('data-category-id');

    expect(categoryId).toBeTruthy();

    if (!categoryId) {
      throw new Error('Could not extract category ID from budget card');
    }

    // Set budget
    await budgetPage.setBudget(categoryId, budgetAmount);

    /**
     * Verify spent amount is displayed and properly formatted.
     * getCategorySpent() parses the currency string and returns a number.
     */
    const spentAmount = await budgetPage.getCategorySpent(categoryId);

    // Spent amount should be a non-negative number
    expect(spentAmount).toBeGreaterThanOrEqual(0);

    /**
     * Verify that the spent amount element contains properly formatted currency.
     * The expectCategorySpent() assertion checks if the element contains the formatted amount.
     */
    await budgetPage.expectCategorySpent(categoryId, spentAmount);
  });

  test('verify multiple budgets for different categories', async ({ budgetPage }) => {
    /**
     * Test scenario:
     * 1. Get multiple budget cards
     * 2. Set budgets for different categories
     * 3. Verify each budget is set correctly
     *
     * This test verifies that the system can manage multiple budgets simultaneously.
     */

    // Get all budget cards
    const budgetCards = await budgetPage.page.locator('[data-testid="budget-card"]');
    const cardCount = await budgetCards.count();

    // Ensure we have at least 2 categories to test
    expect(cardCount).toBeGreaterThanOrEqual(2);

    // Extract category IDs from first two cards
    const firstCard = budgetCards.nth(0);
    const secondCard = budgetCards.nth(1);

    const categoryId1 = await firstCard.getAttribute('data-category-id');
    const categoryId2 = await secondCard.getAttribute('data-category-id');

    expect(categoryId1).toBeTruthy();
    expect(categoryId2).toBeTruthy();

    if (!categoryId1 || !categoryId2) {
      throw new Error('Could not extract category IDs from budget cards');
    }

    // Set different budget amounts for each category
    const budget1 = TEST_AMOUNTS.BUDGET_SMALL; // 500k
    const budget2 = TEST_AMOUNTS.BUDGET_LARGE; // 3M

    await budgetPage.setBudget(categoryId1, budget1);
    await budgetPage.setBudget(categoryId2, budget2);

    // Verify both budgets are set correctly
    await budgetPage.expectBudgetSet(categoryId1, budget1);
    await budgetPage.expectBudgetSet(categoryId2, budget2);

    /**
     * Verify that the spent amounts are correctly retrieved for both categories.
     * This ensures the UI properly isolates data by category.
     */
    const spent1 = await budgetPage.getCategorySpent(categoryId1);
    const spent2 = await budgetPage.getCategorySpent(categoryId2);

    // Both spent amounts should be non-negative
    expect(spent1).toBeGreaterThanOrEqual(0);
    expect(spent2).toBeGreaterThanOrEqual(0);
  });

  test('budget card displays all required elements', async ({ budgetPage }) => {
    /**
     * Test scenario:
     * 1. Set a budget for a category
     * 2. Verify all required UI elements are visible
     *
     * This is a UI completeness test to ensure all budget information is displayed.
     */

    const budgetAmount = TEST_AMOUNTS.BUDGET_MEDIUM; // 1.5M IDR

    // Get first budget card
    const budgetCards = await budgetPage.page.locator('[data-testid="budget-card"]');
    const firstCard = budgetCards.first();
    const categoryId = await firstCard.getAttribute('data-category-id');

    expect(categoryId).toBeTruthy();

    if (!categoryId) {
      throw new Error('Could not extract category ID from budget card');
    }

    // Set budget
    await budgetPage.setBudget(categoryId, budgetAmount);

    /**
     * Verify all required elements are present in the budget card:
     * 1. Budget amount display
     * 2. Spent amount display
     * 3. Percentage display
     * 4. Budget card itself
     */

    // Verify budget amount is visible
    await budgetPage.expectBudgetCardVisible(categoryId);
    await budgetPage.expectBudgetSet(categoryId, budgetAmount);

    // Verify spent amount element is visible
    const spentElement = await budgetPage.page
      .locator(`[data-testid="budget-spent"][data-category-id="${categoryId}"]`)
      .isVisible();
    expect(spentElement).toBe(true);

    // Verify percentage element is visible
    const percentageElement = await budgetPage.page
      .locator(`[data-testid="budget-percentage"][data-category-id="${categoryId}"]`)
      .isVisible();
    expect(percentageElement).toBe(true);
  });
});
