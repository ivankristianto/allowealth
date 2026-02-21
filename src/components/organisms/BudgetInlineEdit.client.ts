/**
 * Budget Inline Edit Client Module
 *
 * Handles inline editing of budget amounts in both card and table views.
 * Uses a popover anchored to the edit icon for a clean editing experience.
 *
 * Part of the Interactive Page Architecture pattern.
 * See: docs/architecture/002-interactive-pages.md
 */

import { csrfFetch } from '@/lib/csrf-client';
import { addToast } from '@/lib/stores/toastStore';
import {
  attachAmountFormatter,
  configureAmountInputElement,
  stripAmountFormatting,
} from '@/lib/formatting/amount-input';
import type { AmountFormatterHandle } from '@/lib/formatting/amount-input';
import type { Currency } from '@/lib/constants/currency';

// =============================================================================
// STATE
// =============================================================================

/** Currently active edit (only one at a time) */
let activeEditCategoryId: string | null = null;

/** Reference to the active popover element */
let activePopover: HTMLElement | null = null;

/** Reference to the trigger button for focus restoration */
let activeTrigger: HTMLElement | null = null;

/** Handle for the active amount formatter (for cleanup) */
let activeFormatter: AmountFormatterHandle | null = null;

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
// CURRENCY LOOKUP
// =============================================================================

/**
 * Read the budget page's active currency from `data-currency` on the container.
 * Falls back to 'IDR' if not set.
 */
function getBudgetCurrency(): Currency {
  const container = document.querySelector('[data-budget-container]');
  return (container?.getAttribute('data-currency') as Currency) || 'IDR';
}

// =============================================================================
// BUDGET ID LOOKUP
// =============================================================================

/**
 * Look up the budget ID for a category from the page's data attributes.
 *
 * The budget page stores category data (including budget IDs) in
 * `data-expense-categories` JSON on the `[data-budget-container]` element.
 */
function getBudgetIdForCategory(categoryId: string): string | null {
  const container = document.querySelector('[data-budget-container]');
  if (!container) return null;

  const categoriesJson = container.getAttribute('data-expense-categories');
  if (!categoriesJson) return null;

  try {
    const categories = JSON.parse(categoriesJson) as Array<{
      id: string;
      budget_id?: string;
    }>;
    const match = categories.find((c) => c.id === categoryId);
    return match?.budget_id || null;
  } catch {
    return null;
  }
}

// =============================================================================
// POSITIONING
// =============================================================================

/**
 * Position the popover below the trigger element using getBoundingClientRect().
 * Falls back to above the trigger if there's not enough space below.
 * Works across all browsers regardless of CSS Anchor Positioning support.
 */
function positionPopover(popover: HTMLElement, trigger: HTMLElement): void {
  const rect = trigger.getBoundingClientRect();
  const popoverWidth = 224; // w-56 = 14rem = 224px
  const popoverHeight = popover.offsetHeight || 120;
  const gap = 4;

  // Position below trigger, centered horizontally
  let left = rect.left + rect.width / 2 - popoverWidth / 2;
  let top = rect.bottom + gap;

  // Clamp horizontally within viewport
  const viewportWidth = window.innerWidth;
  if (left < 8) left = 8;
  if (left + popoverWidth > viewportWidth - 8) left = viewportWidth - popoverWidth - 8;

  // If popover overflows below viewport, position above the trigger instead
  const viewportHeight = window.innerHeight;
  if (top + popoverHeight > viewportHeight - 8) {
    top = rect.top - popoverHeight - gap;
  }

  // Final clamp: don't go above viewport
  if (top < 8) top = 8;

  popover.style.position = 'fixed';
  popover.style.inset = 'unset';
  popover.style.margin = '0';
  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
}

// =============================================================================
// POPOVER EDIT UI
// =============================================================================

/** Counter for unique popover IDs */
let popoverCounter = 0;

/**
 * Open a popover for editing a budget amount.
 *
 * Creates a popover element positioned below the edit icon button with an input
 * field and Save/Cancel buttons. Only one popover can be open at a time.
 */
function openEditPopover(trigger: HTMLElement, categoryId: string): void {
  // Prevent concurrent edits
  if (activeEditCategoryId !== null) {
    addToast('Please save or cancel the current edit first.', 'info');
    return;
  }

  const rawAmount = trigger.dataset.budgetRaw || '0';
  const budgetId = getBudgetIdForCategory(categoryId);

  if (!budgetId) {
    addToast('Could not find budget to edit. Try refreshing the page.', 'error');
    return;
  }

  // Store state
  activeEditCategoryId = categoryId;
  activeTrigger = trigger;

  // Create unique IDs
  const popoverId = `budget-edit-popover-${++popoverCounter}`;
  const inputId = `budget-edit-input-${popoverCounter}`;

  // Build the popover element
  const popover = document.createElement('div');
  popover.id = popoverId;
  popover.setAttribute('popover', 'auto');
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', 'Edit budget amount');
  popover.className = 'bg-base-100 border border-base-300 rounded-xl shadow-xl p-3 m-0 w-56';
  popover.dataset.budgetPopover = 'true';

  // Popover content
  const label = document.createElement('label');
  label.className = 'text-xs font-bold text-base-content/40 uppercase tracking-widest mb-1.5 block';
  label.textContent = 'Budget Amount';
  label.htmlFor = inputId;

  const input = document.createElement('input');
  configureAmountInputElement(input, {
    id: inputId,
    value: rawAmount,
    currency: getBudgetCurrency(),
    className: 'input input-sm input-bordered w-full text-right font-bold rounded-lg',
    ariaLabel: 'Budget amount',
  });
  input.dataset.inlineEditInput = 'true';

  // Attach amount formatter for thousand separators
  activeFormatter = attachAmountFormatter(input, getBudgetCurrency());

  const btnRow = document.createElement('div');
  btnRow.className = 'flex items-center gap-2 mt-2';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn btn-xs btn-accent rounded-lg font-bold flex-1';
  saveBtn.textContent = 'Save';
  saveBtn.dataset.inlineEditSave = 'true';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn-xs btn-ghost rounded-lg font-bold flex-1';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.dataset.inlineEditCancel = 'true';

  btnRow.appendChild(saveBtn);
  btnRow.appendChild(cancelBtn);

  popover.appendChild(label);
  popover.appendChild(input);
  popover.appendChild(btnRow);

  // Append to body and show
  document.body.appendChild(popover);
  activePopover = popover;

  // Feature-detect Popover API; fall back to manual visibility if unsupported
  if (typeof popover.showPopover === 'function') {
    popover.showPopover();
  } else {
    popover.removeAttribute('popover');
    popover.style.display = 'block';
  }

  // Position using getBoundingClientRect (cross-browser)
  positionPopover(popover, trigger);

  // Focus the input and select all text
  input.focus();
  input.select();

  // Event handlers
  saveBtn.addEventListener('click', () => {
    handleSave(budgetId, input.value, categoryId);
  });

  cancelBtn.addEventListener('click', () => {
    cancelEditMode();
  });

  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave(budgetId, input.value, categoryId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditMode();
    }
  });

  // Handle popover auto-dismiss (click outside)
  popover.addEventListener('toggle', ((e: ToggleEvent) => {
    if (e.newState === 'closed' && activePopover === popover) {
      // Use cancelEditMode to properly clean up all state including activeTrigger
      cancelEditMode();
    }
  }) as EventListener);
}

/**
 * Remove the active popover from the DOM and reset state.
 */
function cleanupPopover(): void {
  // Null reference first to prevent re-entrant calls from toggle event
  const popover = activePopover;
  activePopover = null;
  activeEditCategoryId = null;
  activeTrigger = null;

  if (activeFormatter) {
    activeFormatter.cleanup();
    activeFormatter = null;
  }

  if (popover) {
    try {
      if (typeof popover.hidePopover === 'function') popover.hidePopover();
    } catch {
      // Already hidden or popover API unsupported
    }
    popover.remove();
  }
}

/**
 * Cancel edit mode and close the popover.
 *
 * Exported so the page orchestrator can call it when DOM is replaced
 * (e.g., after budget-updated refresh), preventing orphaned edit state.
 */
export function cancelEditMode(): void {
  const triggerToFocus = activeTrigger;
  cleanupPopover();

  // Return focus to the trigger element so keyboard users don't lose position
  triggerToFocus?.focus();
}

/**
 * Handle save: validate, call API, refresh page.
 */
async function handleSave(budgetId: string, value: string, categoryId: string): Promise<void> {
  // Strip formatting before validation
  const strippedValue = stripAmountFormatting(value, getBudgetCurrency());
  const validation = validateBudgetAmount(strippedValue);
  if (!validation.valid) {
    addToast(validation.error || 'Invalid budget amount', 'error');
    return;
  }

  // Show loading state
  const saveBtn = activePopover?.querySelector(
    '[data-inline-edit-save]'
  ) as HTMLButtonElement | null;
  const input = activePopover?.querySelector('[data-inline-edit-input]') as HTMLInputElement | null;
  const cancelBtnEl = activePopover?.querySelector(
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
      body: JSON.stringify({ budget_amount: strippedValue }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as { message?: string }).message || 'Failed to update budget');
    }

    addToast('Budget updated successfully!', 'success');

    // Close the popover before refresh
    cancelEditMode();

    // Dispatch event for page orchestrator to refresh all partials
    document.dispatchEvent(
      new CustomEvent('budget-updated', {
        detail: { categoryId, budgetId, budgetAmount: strippedValue },
      })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update budget';
    addToast(message, 'error');

    // Close popover on error
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
 * Handle click on an editable budget edit icon (event delegation).
 */
function handleEditableClick(e: Event): void {
  const target = (e.target as HTMLElement).closest('[data-budget-editable]') as HTMLElement | null;
  if (!target) return;

  const categoryId = target.dataset.budgetEditable;
  if (!categoryId) return;

  e.stopPropagation();
  openEditPopover(target, categoryId);
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

  const categoryId = target.dataset.budgetEditable;
  if (!categoryId) return;

  keyEvent.preventDefault();
  keyEvent.stopPropagation();
  openEditPopover(target, categoryId);
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

document.addEventListener('astro:before-swap', () => {
  cancelEditMode();
});
