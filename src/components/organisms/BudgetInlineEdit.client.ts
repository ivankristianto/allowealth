/**
 * Budget Inline Edit Client Module
 *
 * Handles inline editing of budget amounts in both card and table views.
 * Uses hybrid approach: client-side input for speed, server-rendered refresh for consistency.
 *
 * Part of the Interactive Page Architecture pattern.
 * See: docs/architecture/002-interactive-pages.md
 */

import { csrfFetch } from '@/lib/csrf-client';
import { addToast } from '@/lib/stores/toastStore';

// =============================================================================
// STATE
// =============================================================================

/** Currently active edit (only one at a time) */
let activeEditCategoryId: string | null = null;

/** Original element content for restoring on cancel */
let originalElementHtml: string | null = null;

/** Reference to the element currently being edited */
let activeEditElement: HTMLElement | null = null;

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate budget amount input.
 * Uses Number() for strict validation (rejects "1,000", "100abc", etc.)
 * Mirrors server-side validation from src/lib/validation/budgets.ts
 */
export function validateBudgetAmount(value: string): { valid: boolean; error?: string } {
  if (!value || value.trim() === '') {
    return { valid: false, error: 'Budget amount is required' };
  }

  const num = Number(value);

  if (isNaN(num)) {
    return { valid: false, error: 'Budget amount must be a valid number' };
  }

  if (num <= 0) {
    return { valid: false, error: 'Budget amount must be a positive number' };
  }

  return { valid: true };
}

// =============================================================================
// BUDGET ID LOOKUP
// =============================================================================

/**
 * Look up the budget ID for a category from the page's data attributes.
 *
 * The budget page stores existing budgets in `data-expense-categories` JSON on the
 * `[data-budget-container]` element. We also need the budget IDs which are stored
 * separately. The budget IDs can be found from the budgets data.
 */
function getBudgetIdForCategory(categoryId: string): string | null {
  const container = document.querySelector('[data-budget-container]');
  if (!container) return null;

  // Budget IDs are stored in the modal's option elements
  const modalCategory = document.querySelector(
    `#set-new-budget-modal-category option[value="${categoryId}"]`
  ) as HTMLOptionElement | null;

  if (modalCategory?.dataset.budgetId) {
    return modalCategory.dataset.budgetId;
  }

  return null;
}

// =============================================================================
// INLINE EDIT UI
// =============================================================================

/**
 * Enter edit mode on a budget amount element.
 *
 * Replaces the formatted amount text with an input field + Save/Cancel buttons.
 * Only one budget can be edited at a time.
 */
function enterEditMode(element: HTMLElement, categoryId: string): void {
  // Prevent concurrent edits
  if (activeEditCategoryId !== null) {
    addToast('Please save or cancel the current edit first.', 'info');
    return;
  }

  const rawAmount = element.dataset.budgetRaw || '0';
  const budgetId = getBudgetIdForCategory(categoryId);

  if (!budgetId) {
    addToast('Could not find budget to edit. Try refreshing the page.', 'error');
    return;
  }

  // Store state for cancel/restore
  activeEditCategoryId = categoryId;
  originalElementHtml = element.innerHTML;
  activeEditElement = element;

  // Determine if this is inside a card or table for styling
  const isTable = element.closest('[data-budget-table]') !== null;

  // Build inline edit UI
  const wrapper = document.createElement('div');
  wrapper.className = isTable ? 'inline-flex items-center gap-2' : 'flex items-center gap-2';
  wrapper.dataset.inlineEdit = 'true';

  const input = document.createElement('input');
  input.type = 'number';
  input.value = rawAmount;
  input.min = '0';
  input.step = '0.01';
  input.className = isTable
    ? 'input input-sm input-bordered w-28 text-right font-bold rounded-lg'
    : 'input input-sm input-bordered w-full text-right font-bold rounded-lg';
  input.dataset.inlineEditInput = 'true';
  input.setAttribute('aria-label', 'Budget amount');

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn btn-xs btn-accent rounded-lg font-bold';
  saveBtn.textContent = 'Save';
  saveBtn.dataset.inlineEditSave = 'true';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn-xs btn-ghost rounded-lg font-bold';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.dataset.inlineEditCancel = 'true';

  wrapper.appendChild(input);
  wrapper.appendChild(saveBtn);
  wrapper.appendChild(cancelBtn);

  // Replace element content
  element.innerHTML = '';
  element.appendChild(wrapper);
  element.classList.remove('cursor-pointer');
  element.removeAttribute('role');
  element.removeAttribute('tabindex');

  // Focus the input and select all text
  input.focus();
  input.select();

  // Event handlers
  saveBtn.addEventListener('click', () => {
    handleSave(element, budgetId, input.value, categoryId);
  });

  cancelBtn.addEventListener('click', () => {
    cancelEditMode();
  });

  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave(element, budgetId, input.value, categoryId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditMode();
    }
  });
}

/**
 * Cancel edit mode and restore the original content.
 */
function cancelEditMode(): void {
  if (activeEditElement && originalElementHtml !== null) {
    activeEditElement.innerHTML = originalElementHtml;
    activeEditElement.classList.add('cursor-pointer');
    activeEditElement.setAttribute('role', 'button');
    activeEditElement.setAttribute('tabindex', '0');
  }

  activeEditCategoryId = null;
  originalElementHtml = null;
  activeEditElement = null;
}

/**
 * Handle save: validate, call API, refresh page.
 */
async function handleSave(
  element: HTMLElement,
  budgetId: string,
  value: string,
  categoryId: string
): Promise<void> {
  // Validate
  const validation = validateBudgetAmount(value);
  if (!validation.valid) {
    addToast(validation.error || 'Invalid budget amount', 'error');
    return;
  }

  // Show loading state on Save button
  const saveBtn = element.querySelector('[data-inline-edit-save]') as HTMLButtonElement | null;
  const input = element.querySelector('[data-inline-edit-input]') as HTMLInputElement | null;
  const cancelBtnEl = element.querySelector(
    '[data-inline-edit-cancel]'
  ) as HTMLButtonElement | null;

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
  }
  if (input) input.disabled = true;
  if (cancelBtnEl) cancelBtnEl.disabled = true;

  try {
    const response = await csrfFetch(`/api/budgets/${budgetId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budget_amount: value }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as { message?: string }).message || 'Failed to update budget');
    }

    // Reset edit state before refresh (refresh replaces DOM)
    activeEditCategoryId = null;
    originalElementHtml = null;
    activeEditElement = null;

    addToast('Budget updated successfully!', 'success');

    // Dispatch event for page orchestrator
    document.dispatchEvent(
      new CustomEvent('budget-updated', {
        detail: { categoryId, budgetId, budgetAmount: value },
      })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update budget';
    addToast(message, 'error');

    // Revert to display mode on error
    cancelEditMode();
  }
}

// =============================================================================
// EVENT SETUP
// =============================================================================

/**
 * Set up click handlers on all `[data-budget-editable]` elements.
 *
 * Uses event delegation on the budget container for efficiency
 * and to handle dynamically injected content.
 */
export function setupInlineEditHandlers(): void {
  const container = document.querySelector('[data-budget-container]');
  if (!container) return;

  // Remove previous listener to prevent duplicates
  container.removeEventListener('click', handleEditableClick);
  container.removeEventListener('keydown', handleEditableKeydown);

  container.addEventListener('click', handleEditableClick);
  container.addEventListener('keydown', handleEditableKeydown);
}

/**
 * Handle click on an editable budget amount (event delegation).
 */
function handleEditableClick(e: Event): void {
  const target = (e.target as HTMLElement).closest('[data-budget-editable]') as HTMLElement | null;
  if (!target) return;

  // Don't enter edit mode if we're already inside an inline edit
  if (target.querySelector('[data-inline-edit]')) return;

  const categoryId = target.dataset.budgetEditable;
  if (!categoryId) return;

  e.stopPropagation();
  enterEditMode(target, categoryId);
}

/**
 * Handle keyboard activation (Enter/Space) on editable elements.
 */
function handleEditableKeydown(e: Event): void {
  const keyEvent = e as KeyboardEvent;
  if (keyEvent.key !== 'Enter' && keyEvent.key !== ' ') return;

  const target = (keyEvent.target as HTMLElement).closest(
    '[data-budget-editable]'
  ) as HTMLElement | null;
  if (!target) return;

  // Don't enter edit mode if we're already inside an inline edit
  if (target.querySelector('[data-inline-edit]')) return;

  const categoryId = target.dataset.budgetEditable;
  if (!categoryId) return;

  keyEvent.preventDefault();
  keyEvent.stopPropagation();
  enterEditMode(target, categoryId);
}

/**
 * Clean up inline edit state.
 * Call when the page is being torn down (Astro page transition).
 */
export function cleanupInlineEdit(): void {
  cancelEditMode();

  const container = document.querySelector('[data-budget-container]');
  if (container) {
    container.removeEventListener('click', handleEditableClick);
    container.removeEventListener('keydown', handleEditableKeydown);
  }
}
