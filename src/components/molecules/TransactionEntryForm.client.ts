/** Transaction entry form: type and category chips, account-driven currency, validation and submit. */

import { addToast } from '@/lib/stores/toastStore';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { CURRENCY_META, DEFAULT_CURRENCY } from '@/lib/constants/currency';
import type { Currency } from '@/lib/constants/currency';
import { attachAmountFormatter, stripAmountFormatting } from '@/lib/formatting/amount-input';
import type { AmountFormatterHandle } from '@/lib/formatting/amount-input';

function initTransactionEntryForms() {
  document.querySelectorAll<HTMLFormElement>('[data-transaction-form]').forEach(initForm);
}

function initForm(form: HTMLFormElement) {
  if (form.dataset.initialized === 'true') return;
  form.dataset.initialized = 'true';

  const formId = form.id;
  const formError = document.getElementById(`${formId}-error`);
  const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
  const action = form.dataset.action || '/api/transactions';
  const modalId = form.dataset.modalId || '';
  const todayStr = form.dataset.today || new Date().toISOString().split('T')[0];
  const yesterdayStr = form.dataset.yesterday || '';

  const categories = JSON.parse(form.dataset.categoriesJson || '[]');
  const accounts = JSON.parse(form.dataset.accountsJson || '[]') as Array<{
    id: string;
    currency?: Currency;
  }>;

  // === Category chip handlers ===
  const categoryChips = form.querySelectorAll<HTMLButtonElement>('[data-category-chip]');
  const categorySelect = form.querySelector(
    'select[name="category_id"]'
  ) as HTMLSelectElement | null;
  function setActiveChip(categoryId: string) {
    categoryChips.forEach((chip) => {
      const isActive = chip.dataset.categoryChip === categoryId;
      chip.classList.toggle('bg-accent', isActive);
      chip.classList.toggle('text-white', isActive);
      chip.classList.toggle('bg-base-200', !isActive);
      chip.classList.toggle('text-base-content/70', !isActive);
      chip.classList.toggle('hover:bg-accent/10', !isActive);
      chip.classList.toggle('hover:text-accent', !isActive);
      chip.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });
    if (categorySelect) {
      categorySelect.value = categoryId;
      categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    validateField('category_id', categoryId);
    ensureCategoryVisible(categoryId);
  }

  categoryChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const catId = chip.dataset.categoryChip || '';
      setActiveChip(catId);
    });
  });

  // === Category expand/collapse toggle ===
  const overflowChips = form.querySelectorAll<HTMLButtonElement>('[data-category-overflow]');
  const toggleBtn = form.querySelector('[data-category-toggle]') as HTMLButtonElement | null;

  if (toggleBtn && overflowChips.length > 0) {
    toggleBtn.addEventListener('click', () => {
      const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        // Collapsing: hide overflow chips except the active one
        overflowChips.forEach((chip) => {
          const isActive = chip.getAttribute('aria-checked') === 'true';
          chip.classList.toggle('hidden', !isActive);
        });
      } else {
        // Expanding: show all overflow chips
        overflowChips.forEach((chip) => chip.classList.remove('hidden'));
      }
      toggleBtn.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
      const label = isExpanded ? `+${overflowChips.length} more` : 'Less';
      toggleBtn.textContent = label;
      toggleBtn.setAttribute(
        'aria-label',
        isExpanded ? `Show ${overflowChips.length} more categories` : 'Show less categories'
      );
    });
  }

  // Auto-expand if selecting a hidden category (e.g., in edit mode)
  function ensureCategoryVisible(categoryId: string) {
    if (!toggleBtn || overflowChips.length === 0) return;
    const isOverflow = Array.from(overflowChips).some((c) => c.dataset.categoryChip === categoryId);
    if (isOverflow && toggleBtn.getAttribute('aria-expanded') !== 'true') {
      overflowChips.forEach((chip) => chip.classList.remove('hidden'));
      toggleBtn.setAttribute('aria-expanded', 'true');
      toggleBtn.textContent = 'Less';
      toggleBtn.setAttribute('aria-label', 'Show less categories');
    }
  }

  // === Date quick-pick handlers ===
  const datePickBtns = form.querySelectorAll<HTMLElement>('[data-date-pick]');
  const dateCustomInput = form.querySelector('[data-date-custom]') as HTMLInputElement | null;
  const dateLabel = form.querySelector('[data-date-label]') as HTMLElement | null;
  const hiddenDateInput = form.querySelector(
    'input[name="transaction_date"]'
  ) as HTMLInputElement | null;

  function formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  function setDateValue(dateStr: string, activePick: string) {
    if (hiddenDateInput) hiddenDateInput.value = dateStr;
    if (dateCustomInput) dateCustomInput.value = dateStr;

    // Update the label to show the selected custom date
    if (dateLabel) {
      dateLabel.textContent = activePick === 'custom' ? formatDateLabel(dateStr) : 'Other';
    }

    datePickBtns.forEach((btn) => {
      const pick = btn.dataset.datePick || '';
      const isActive = pick === activePick;
      btn.classList.toggle('btn-accent', isActive);
      btn.classList.toggle('text-accent-content', isActive);
      btn.classList.toggle('btn-ghost', !isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    validateField('transaction_date', dateStr);
  }

  datePickBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const pick = btn.dataset.datePick || '';
      if (pick === 'today') {
        e.preventDefault();
        setDateValue(todayStr, 'today');
      } else if (pick === 'yesterday') {
        e.preventDefault();
        setDateValue(yesterdayStr, 'yesterday');
      } else if (pick === 'custom' && dateCustomInput) {
        e.preventDefault();
        try {
          dateCustomInput.showPicker();
        } catch {
          dateCustomInput.focus();
          dateCustomInput.click();
        }
      }
    });
  });

  if (dateCustomInput) {
    dateCustomInput.addEventListener('change', () => {
      const val = dateCustomInput.value;
      if (val) {
        const activePick =
          val === todayStr ? 'today' : val === yesterdayStr ? 'yesterday' : 'custom';
        setDateValue(val, activePick);
      }
    });
  }

  // === Currency derived from selected account ===
  const currencyBadge = form.querySelector('[data-currency-badge]') as HTMLElement | null;
  const currencyInput = form.querySelector('input[name="currency"]') as HTMLInputElement | null;

  function applyCurrency(currency: Currency) {
    if (currencyInput) {
      currencyInput.value = currency;
    }

    if (currencyBadge) {
      const meta = CURRENCY_META[currency];
      currencyBadge.textContent = `${meta.symbol} ${currency}`;
      currencyBadge.setAttribute('aria-label', `Currency: ${currency}`);
    }

    amountFormatter?.updateCurrency(currency);
  }

  function syncCurrencyFromSelectedAccount() {
    if (!currencyInput) return;

    const accountSelect = form.querySelector(
      'select[name="account_id"]'
    ) as HTMLSelectElement | null;
    const accountId =
      accountSelect?.value ||
      (form.querySelector('input[name="account_id"]') as HTMLInputElement | null)?.value ||
      '';
    const selectedAccount = accounts.find((account) => account.id === accountId);
    const currency = (selectedAccount?.currency || DEFAULT_CURRENCY) as Currency;
    applyCurrency(currency);
  }

  // === Validation ===
  const validators: Record<string, { validate: (value: string) => string | null }> = {
    title: {
      validate: (value) => {
        if (!value || value.trim() === '') return 'Title is required';
        if (value.length > 200) return 'Title must not exceed 200 characters';
        return null;
      },
    },
    amount: {
      validate: (value) => {
        if (!value || value.trim() === '') return 'Amount is required';
        const currentCurrency = (currencyInput?.value || DEFAULT_CURRENCY) as Currency;
        const cleanValue = stripAmountFormatting(value, currentCurrency);
        const num = Number(cleanValue);
        if (isNaN(num)) return 'Amount must be a valid number';
        if (num <= 0) return 'Amount must be greater than 0';
        return null;
      },
    },
    transaction_date: {
      validate: (value) => {
        if (!value || value.trim() === '') return 'Date is required';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Date must be in YYYY-MM-DD format';
        const date = new Date(value);
        if (isNaN(date.getTime())) return 'Invalid date';
        const todayUTC = Date.now();
        const inputDateUTC = new Date(value).getTime();
        if (inputDateUTC > todayUTC) return 'Date cannot be in the future';
        return null;
      },
    },
    category_id: {
      validate: (value) => {
        if (!value || value.trim() === '') return 'Category is required';
        return null;
      },
    },
    account_id: {
      validate: (value) => {
        if (!value || value.trim() === '') return 'Account is required';
        return null;
      },
    },
  };

  const fieldErrors: Record<string, string | null> = {};
  let isResetting = false;

  function updateFieldErrorUI(fieldName: string, errorMessage: string | null) {
    // For chip-based fields, look for the form-control container differently
    let fieldContainer: Element | null = null;

    if (fieldName === 'category_id') {
      fieldContainer =
        form.querySelector('[data-category-chips]')?.closest('.form-control') || null;
    } else {
      const field = form.querySelector(`[name="${fieldName}"]`) as HTMLElement | null;
      if (!field) return;
      fieldContainer = field.closest('.form-control');
    }

    if (!fieldContainer) return;

    const existingError = fieldContainer.querySelector('.field-error');
    if (existingError) existingError.remove();

    const errorDivId = `${formId}-${fieldName}-error`;

    if (errorMessage) {
      const field = form.querySelector(`[name="${fieldName}"]`) as HTMLElement | null;
      if (field) {
        field.classList.add('input-error', 'border-error');
        field.setAttribute('aria-invalid', 'true');
        field.setAttribute('aria-describedby', errorDivId);
      }

      const errorDiv = document.createElement('div');
      errorDiv.className = 'field-error text-error text-sm mt-1';
      errorDiv.id = errorDivId;
      errorDiv.textContent = errorMessage;
      errorDiv.setAttribute('role', 'alert');
      fieldContainer.appendChild(errorDiv);
    } else {
      const field = form.querySelector(`[name="${fieldName}"]`) as HTMLElement | null;
      if (field) {
        field.classList.remove('input-error', 'border-error');
        field.setAttribute('aria-invalid', 'false');
        field.removeAttribute('aria-describedby');
      }
    }
  }

  function validateField(fieldName: string, value: string): string | null {
    if (isResetting) return null;
    const validator = validators[fieldName];
    if (!validator) return null;

    const error = validator.validate(value);
    fieldErrors[fieldName] = error;
    updateFieldErrorUI(fieldName, error);
    updateSubmitButton();
    return error;
  }

  function validateForm(): boolean {
    const formData = new FormData(form);
    let isValid = true;

    for (const fieldName of Object.keys(validators)) {
      const value = String(formData.get(fieldName) || '');
      const error = validateField(fieldName, value);
      if (error) isValid = false;
    }

    return isValid;
  }

  function updateSubmitButton() {
    if (!submitButton) return;

    const requiredFields = ['title', 'amount', 'transaction_date', 'category_id', 'account_id'];
    let allValid = true;

    for (const fieldName of requiredFields) {
      const field = form.querySelector(`[name="${fieldName}"]`) as HTMLInputElement | null;
      const value = field?.value || '';
      const hasError = fieldErrors[fieldName] !== null && fieldErrors[fieldName] !== undefined;

      if (hasError || !value || value.trim() === '') {
        allValid = false;
        break;
      }
    }

    submitButton.disabled = !allValid;
  }

  function clearFieldErrors() {
    form.querySelectorAll('.field-error').forEach((el) => el.remove());
    form.querySelectorAll('.input-error, .border-error').forEach((el) => {
      el.classList.remove('input-error', 'border-error');
    });
    if (formError) {
      formError.classList.add('hidden');
      formError.textContent = '';
    }
  }

  function setFieldError(fieldName: string, message: string) {
    let fieldContainer: Element | null = null;
    if (fieldName === 'category_id') {
      fieldContainer =
        form.querySelector('[data-category-chips]')?.closest('.form-control') || null;
    } else {
      fieldContainer =
        form.querySelector(`[name="${fieldName}"]`)?.closest('.form-control') || null;
    }
    if (!fieldContainer) return;

    const existingError = fieldContainer.querySelector('.field-error');
    if (existingError) existingError.remove();

    const input = fieldContainer.querySelector('input, select, textarea');
    if (input) {
      input.classList.add('input-error', 'border-error');
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error text-error text-sm mt-1';
    errorDiv.textContent = message;
    fieldContainer.appendChild(errorDiv);
  }

  // Attach validation listeners
  function attachValidationListeners() {
    const titleInput = form.querySelector('input[name="title"]');
    titleInput?.addEventListener('input', (e: Event) => {
      validateField('title', (e.target as HTMLInputElement).value);
    });

    const amountInput = form.querySelector('input[name="amount"]');
    amountInput?.addEventListener('input', (e: Event) => {
      validateField('amount', (e.target as HTMLInputElement).value);
    });

    categorySelect?.addEventListener('change', (e: Event) => {
      validateField('category_id', (e.target as HTMLSelectElement).value);
    });

    const accountSelect = form.querySelector('select[name="account_id"]');
    accountSelect?.addEventListener('change', (e: Event) => {
      validateField('account_id', (e.target as HTMLSelectElement).value);
      syncCurrencyFromSelectedAccount();
    });
  }

  // Close modal or drawer helper
  function closeModal() {
    if (modalId) {
      const modal = document.getElementById(modalId) as HTMLDialogElement | null;
      if (modal) {
        modal.close();
        return;
      }
    }
    const parentDrawer = form.closest('[data-drawer]') as HTMLElement | null;
    if (parentDrawer) {
      parentDrawer.dispatchEvent(new CustomEvent('drawer:close'));
    }
  }

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const transactionType = form.dataset.type || 'expense';
    const formMode = form.dataset.mode || 'create';
    const transactionId = form.dataset.transactionId || '';
    const isEditMode = formMode === 'edit';

    const isFormValid = validateForm();
    if (!isFormValid) {
      const firstErrorField = form.querySelector('[aria-invalid="true"]') as HTMLElement | null;
      firstErrorField?.focus();
      return;
    }

    clearFieldErrors();

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Saving...';
    }

    try {
      const formData = new FormData(form);
      const data = {
        type: transactionType,
        description: String(formData.get('title') || ''),
        amount: stripAmountFormatting(
          String(formData.get('amount') || '0'),
          (formData.get('currency') || DEFAULT_CURRENCY) as Currency
        ),
        currency: String(formData.get('currency') || DEFAULT_CURRENCY),
        category_id: String(formData.get('category_id') || ''),
        account_id: String(formData.get('account_id') || ''),
        transaction_date: String(
          formData.get('transaction_date') || new Date().toISOString().split('T')[0]
        ),
      };

      const apiUrl = isEditMode ? `${action}/${transactionId}` : action;
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(apiUrl, {
        method,
        headers: getCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result.error?.details) {
          result.error.details.forEach((issue: { path: (string | number)[]; message: string }) => {
            const fieldName = issue.path.join('.') || 'general';
            setFieldError(fieldName, issue.message);
          });
          const firstInvalidField = form.querySelector(
            '.input-error, .select-error, .border-error'
          ) as HTMLElement | null;
          firstInvalidField?.focus();
        } else {
          if (formError) {
            formError.textContent = result.error?.message || 'Failed to save transaction';
            formError.classList.remove('hidden');
          }
        }
      } else {
        const actionWord = isEditMode ? 'updated' : 'saved';
        addToast(
          `${transactionType === 'expense' ? 'Expense' : 'Income'} ${actionWord} successfully!`,
          'success'
        );

        const isBulk = form.dataset.bulk === 'true';

        if (isBulk) {
          form.dispatchEvent(
            new CustomEvent('transaction-submitted', {
              detail: result.data,
              bubbles: true,
            })
          );

          // Preserve date, account, and category on reset
          const prevDate = hiddenDateInput?.value || todayStr;
          const prevAccount = (form.querySelector('select[name="account_id"]') as HTMLSelectElement)
            ?.value;
          const prevCategory = categorySelect?.value || '';
          const prevCurrency = currencyInput?.value || DEFAULT_CURRENCY;

          // Determine which date pick was active
          let prevDatePick = 'today';
          datePickBtns.forEach((btn) => {
            if (btn.getAttribute('aria-pressed') === 'true') {
              prevDatePick = btn.dataset.datePick || 'today';
            }
          });

          // Suppress validation during programmatic reset to prevent
          // input event listeners from showing errors on empty fields
          isResetting = true;

          // Reset title and amount only
          const titleInput = form.querySelector('input[name="title"]') as HTMLInputElement;
          const amountInput = form.querySelector('input[name="amount"]') as HTMLInputElement;
          if (titleInput) titleInput.value = '';
          if (amountInput) amountInput.value = '';

          // Restore preserved values
          if (hiddenDateInput) hiddenDateInput.value = prevDate;
          if (dateCustomInput) dateCustomInput.value = prevDate;
          setDateValue(prevDate, prevDatePick);

          const accountSel = form.querySelector('select[name="account_id"]') as HTMLSelectElement;
          if (accountSel && prevAccount) accountSel.value = prevAccount;

          if (prevCategory) {
            setActiveChip(prevCategory);
          }

          if (currencyInput) currencyInput.value = prevCurrency;
          if (currencyBadge) {
            const meta = CURRENCY_META[prevCurrency as Currency];
            if (meta) {
              currencyBadge.textContent = `${meta.symbol} ${prevCurrency}`;
            }
          }
          // Sync amount formatter locale with restored currency
          amountFormatter?.updateCurrency(prevCurrency as Currency);

          isResetting = false;

          // Clear field error state and UI after reset
          Object.keys(fieldErrors).forEach((k) => {
            fieldErrors[k] = null;
          });
          clearFieldErrors();

          updateSubmitButton();
          // Auto-focus amount for rapid entry
          amountInput?.focus();
        } else {
          closeModal();
          document.dispatchEvent(new CustomEvent('transactions-changed'));
        }
      }
    } catch {
      if (formError) {
        formError.textContent = 'Network error. Please try again.';
        formError.classList.remove('hidden');
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        const currentMode = form.dataset.mode || 'create';
        submitButton.textContent = currentMode === 'edit' ? 'Save Changes' : 'Save Entry';
      }
    }
  });

  // Initialize
  attachValidationListeners();
  updateSubmitButton();

  // When the drawer resets this form, re-evaluate the submit button state.
  // resetEditMode() in TransactionDrawer.client.ts dispatches this event after resetting fields.
  // Clear stale fieldErrors first so a prior failed-submit error doesn't keep the button disabled.
  form.addEventListener('form:reset-state-changed', () => {
    Object.keys(fieldErrors).forEach((k) => {
      fieldErrors[k] = null;
    });
    clearFieldErrors();
    syncCurrencyFromSelectedAccount();
    updateSubmitButton();
  });

  // Attach amount formatter for thousand separators
  const amountInputEl = form.querySelector('input[name="amount"]') as HTMLInputElement;
  let amountFormatter: AmountFormatterHandle | null = null;
  if (amountInputEl) {
    const initialCurrency = (currencyInput?.value || DEFAULT_CURRENCY) as Currency;
    amountFormatter = attachAmountFormatter(amountInputEl, initialCurrency);
  }

  syncCurrencyFromSelectedAccount();

  // Auto-select single category on first load (no choice needed, improves UX for fresh installs).
  // Must run AFTER amountFormatter is initialized so account-driven currency sync can update locale.
  if (categories.length === 1 && categorySelect && !categorySelect.value) {
    setActiveChip(categories[0].id);
  }

  // Auto-focus amount field on initial load (only for create mode)
  if (form.dataset.mode === 'create') {
    const amountInput = form.querySelector('input[name="amount"]') as HTMLInputElement;
    // Delay focus to avoid conflicts with drawer animation
    setTimeout(() => amountInput?.focus(), 100);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTransactionEntryForms);
} else {
  initTransactionEntryForms();
}

document.addEventListener('astro:page-load', initTransactionEntryForms);
