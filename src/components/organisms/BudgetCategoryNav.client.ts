/**
 * Budget Category Navigation
 *
 * Provides ordered category list for prev/next modal navigation.
 * Extracted from BudgetPage.client.ts to avoid importing its
 * module-level side effects (global event listeners) into pages
 * that only use CategoryDrillDownModal (e.g., reports pages).
 */

export interface CategoryNavItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  spent: number;
  budgetLimit: number | null;
  period: string;
}

/**
 * Get ordered list of categories from current card grid DOM
 *
 * Reads from visible cards in their current sort order.
 * Used by CategoryDrillDownModal for prev/next navigation.
 *
 * Returns empty array when not on the budget page (no card grid present).
 */
export function getOrderedCategories(): CategoryNavItem[] {
  // Scope to card grid only to avoid duplicates from table view
  const cardGrid = document.querySelector('[role="list"][aria-label="Budget categories"]');
  if (!cardGrid) return [];

  const cards = cardGrid.querySelectorAll<HTMLElement>('[data-view-details]');
  const items: CategoryNavItem[] = [];

  cards.forEach((btn) => {
    const listItem = btn.closest('[role="listitem"]');
    // Skip hidden (filtered out) cards
    if (listItem && (listItem as HTMLElement).style.display === 'none') return;

    const rawLimit = btn.getAttribute('data-budget-limit');
    items.push({
      categoryId: btn.getAttribute('data-category-id') || '',
      categoryName: btn.getAttribute('data-category-name') || '',
      categoryIcon: btn.getAttribute('data-category-icon') || 'tag',
      categoryColor: btn.getAttribute('data-category-color') || '',
      spent: parseFloat(btn.getAttribute('data-spent') || '0'),
      budgetLimit: rawLimit !== null && rawLimit !== '' ? parseFloat(rawLimit) : null,
      period: btn.getAttribute('data-period') || '',
    });
  });

  return items;
}
