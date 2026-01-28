import { test, expect } from '../test.fixture';
import { generateTestId, generateExpenseCategoryData } from '../../helpers';

/**
 * E2E tests for category CRUD operations.
 * Tests the complete lifecycle of category management:
 * - Create new expense category
 * - Verify category appears in list
 * - Edit category name
 * - Verify edit is saved
 * - Delete category
 * - Verify category is removed
 */
test.describe('Category CRUD Operations', () => {
  test('should create, edit, and delete expense category', async ({ categoriesPage }) => {
    // Generate unique test data
    const categoryData = generateExpenseCategoryData();
    const editedName = `${categoryData.name} (Edited)`;

    // Step 1: Navigate to categories page
    await categoriesPage.gotoCategories();

    // Step 2: Create a new expense category
    await categoriesPage.createCategory(categoryData.name, 'expense');

    // Step 3: Verify category appears in the list
    await categoriesPage.expectCategoryExists(categoryData.name);

    // Step 4: Get the category ID for later use
    const categoryId = await categoriesPage.getCategoryIdByName(categoryData.name);
    expect(categoryId).not.toBeNull();
    expect(categoryId).toBeTruthy();

    // Step 5: Edit the category with a new name
    if (categoryId) {
      await categoriesPage.editCategory(categoryId, editedName);

      // Step 6: Verify edit is saved
      await categoriesPage.expectCategoryExists(editedName);

      // Step 7: Delete the category
      await categoriesPage.deleteCategory(categoryId);

      // Step 8: Verify category is removed
      const deletedCategoryId = await categoriesPage.getCategoryIdByName(editedName);
      expect(deletedCategoryId).toBeNull();
    }
  });

  test('should maintain expense tab selection when creating category', async ({
    categoriesPage,
  }) => {
    // Generate test data
    const categoryData = generateExpenseCategoryData();

    // Navigate to categories page and ensure on expense tab
    await categoriesPage.gotoCategories();
    await categoriesPage.switchToExpenseTab();

    // Create category
    await categoriesPage.createCategory(categoryData.name, 'expense');

    // Verify category exists
    await categoriesPage.expectCategoryExists(categoryData.name);

    // Verify expense tab is still selected
    const expenseTab = categoriesPage.getByTestId('type-filter-expense');
    await expect(expenseTab).toHaveAttribute('aria-selected', 'true');

    // Clean up: Delete the created category
    const categoryId = await categoriesPage.getCategoryIdByName(categoryData.name);
    if (categoryId) {
      await categoriesPage.deleteCategory(categoryId);
    }
  });

  test('should handle multiple category operations in sequence', async ({ categoriesPage }) => {
    // Generate test data for three categories
    const category1 = generateExpenseCategoryData();
    const category2 = generateExpenseCategoryData();
    const category3 = generateExpenseCategoryData();

    // Navigate to categories page
    await categoriesPage.gotoCategories();

    // Create first category
    await categoriesPage.createCategory(category1.name, 'expense');
    await categoriesPage.expectCategoryExists(category1.name);

    // Create second category
    await categoriesPage.createCategory(category2.name, 'expense');
    await categoriesPage.expectCategoryExists(category2.name);

    // Create third category
    await categoriesPage.createCategory(category3.name, 'expense');
    await categoriesPage.expectCategoryExists(category3.name);

    // Verify all three categories exist
    await categoriesPage.expectCategoryExists(category1.name);
    await categoriesPage.expectCategoryExists(category2.name);
    await categoriesPage.expectCategoryExists(category3.name);

    // Delete first category
    const id1 = await categoriesPage.getCategoryIdByName(category1.name);
    if (id1) {
      await categoriesPage.deleteCategory(id1);
      const deletedId1 = await categoriesPage.getCategoryIdByName(category1.name);
      expect(deletedId1).toBeNull();
    }

    // Verify other categories still exist
    await categoriesPage.expectCategoryExists(category2.name);
    await categoriesPage.expectCategoryExists(category3.name);

    // Clean up: Delete remaining categories
    const id2 = await categoriesPage.getCategoryIdByName(category2.name);
    const id3 = await categoriesPage.getCategoryIdByName(category3.name);

    if (id2) {
      await categoriesPage.deleteCategory(id2);
    }
    if (id3) {
      await categoriesPage.deleteCategory(id3);
    }
  });

  test('should edit category name multiple times', async ({ categoriesPage }) => {
    // Generate test data
    const categoryData = generateExpenseCategoryData();
    const editedName1 = `${categoryData.name} v1`;
    const editedName2 = `${categoryData.name} v2`;
    const editedName3 = `${categoryData.name} v3`;

    // Navigate to categories page
    await categoriesPage.gotoCategories();

    // Create category
    await categoriesPage.createCategory(categoryData.name, 'expense');
    await categoriesPage.expectCategoryExists(categoryData.name);

    // Get category ID
    let categoryId = await categoriesPage.getCategoryIdByName(categoryData.name);
    expect(categoryId).not.toBeNull();

    // First edit
    if (categoryId) {
      await categoriesPage.editCategory(categoryId, editedName1);
      await categoriesPage.expectCategoryExists(editedName1);

      // Second edit
      await categoriesPage.editCategory(categoryId, editedName2);
      await categoriesPage.expectCategoryExists(editedName2);

      // Third edit
      await categoriesPage.editCategory(categoryId, editedName3);
      await categoriesPage.expectCategoryExists(editedName3);

      // Clean up: Delete the category
      await categoriesPage.deleteCategory(categoryId);
      const deletedId = await categoriesPage.getCategoryIdByName(editedName3);
      expect(deletedId).toBeNull();
    }
  });

  test('should create category with special characters in name', async ({ categoriesPage }) => {
    // Generate test data with special characters
    const specialCategoryName = `Test & Special (${generateTestId()}) - Characters!`;

    // Navigate to categories page
    await categoriesPage.gotoCategories();

    // Create category with special characters
    await categoriesPage.createCategory(specialCategoryName, 'expense');
    await categoriesPage.expectCategoryExists(specialCategoryName);

    // Get and verify the category was created
    const categoryId = await categoriesPage.getCategoryIdByName(specialCategoryName);
    expect(categoryId).not.toBeNull();

    // Clean up: Delete the category
    if (categoryId) {
      await categoriesPage.deleteCategory(categoryId);
    }
  });

  test('should handle category tab switching without losing data', async ({ categoriesPage }) => {
    // Generate test data for both types
    const expenseCategory = generateExpenseCategoryData();

    // Navigate to categories page
    await categoriesPage.gotoCategories();

    // Create expense category
    await categoriesPage.createCategory(expenseCategory.name, 'expense');
    await categoriesPage.expectCategoryExists(expenseCategory.name);

    // Switch to income tab and back
    await categoriesPage.switchToIncomeTab();
    await categoriesPage.switchToExpenseTab();

    // Verify expense category still exists
    await categoriesPage.expectCategoryExists(expenseCategory.name);

    // Clean up: Delete the category
    const categoryId = await categoriesPage.getCategoryIdByName(expenseCategory.name);
    if (categoryId) {
      await categoriesPage.deleteCategory(categoryId);
    }
  });
});
