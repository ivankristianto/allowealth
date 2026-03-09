import { getCsrfHeaders } from '@/lib/csrf-client';
import { addToast } from '@/lib/stores/toastStore';
import {
  attachAmountFormatter,
  stripAmountFormatting,
  formatAmountForDisplay,
} from '@/lib/formatting/amount-input';
import { DEFAULT_CURRENCY, isValidCurrency, type Currency } from '@/lib/constants/currency';
import { normalizeInstallmentState, type EndMode } from '@/components/organisms/recurring-ui';

interface RecurringTemplateLike {
  id: string;
  name: string;
  type: 'expense' | 'income';
  amount: string;
  currency: string;
  category: { id: string };
  account: { id: string };
  day_of_month: number;
  frequency: 'weekly' | 'monthly';
  interval_count: number;
  start_date: string;
  end_date: string | null;
  total_occurrences: number | null;
  is_installment: boolean;
  installment_label: string | null;
  starting_occurrence_number: number;
  description: string | null;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
}

interface RecurringTemplatePrefill {
  name: string;
  type: 'expense' | 'income';
  amount: string;
  currency: string;
  category_id: string;
  account_id: string;
  day_of_month: number;
  start_month: string;
  description?: string;
}

let controller: AbortController | null = null;
let amountFormatter: ReturnType<typeof attachAmountFormatter> | null = null;

function getCurrentMonthValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getCurrentDateValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function initRecurringTemplateForm(): void {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  const drawer = document.getElementById('recurring-template-drawer') as HTMLElement | null;
  const form = document.getElementById('recurring-template-form') as HTMLFormElement | null;

  if (!drawer || !form) return;

  const errorBox = form.querySelector('[data-template-form-error]') as HTMLElement | null;
  const submitBtn = form.querySelector('[data-template-form-submit]') as HTMLButtonElement | null;
  const cancelBtn = form.querySelector('[data-template-form-cancel]') as HTMLButtonElement | null;
  const drawerHeading = drawer.querySelector(
    '#recurring-template-drawer-title'
  ) as HTMLElement | null;
  const drawerSubtitle = drawer.querySelector('[data-drawer-subtitle]') as HTMLElement | null;
  const descriptionDetails = form.querySelector(
    '[data-recurring-description-details]'
  ) as HTMLDetailsElement | null;

  const typeInputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="type"]'));
  const typeOptionLabels = Array.from(form.querySelectorAll<HTMLElement>('[data-type-option]'));
  const categorySelect = form.querySelector(
    'select[name="category_id"]'
  ) as HTMLSelectElement | null;
  const amountInput = form.querySelector('input[name="amount"]') as HTMLInputElement | null;
  const currencySelect = form.querySelector('select[name="currency"]') as HTMLSelectElement | null;

  const endModeInputs = Array.from(
    form.querySelectorAll<HTMLInputElement>('input[name="end_mode"]')
  );
  const totalOccurrencesInput = form.querySelector(
    'input[name="total_occurrences"]'
  ) as HTMLInputElement | null;
  const endDateInput = form.querySelector('input[name="end_date"]') as HTMLInputElement | null;
  const countContainer = form.querySelector('[data-end-input="count"]') as HTMLElement | null;
  const dateContainer = form.querySelector('[data-end-input="date"]') as HTMLElement | null;

  const installmentToggle = form.querySelector(
    'input[name="is_installment"]'
  ) as HTMLInputElement | null;
  const installmentFields = form.querySelector('[data-installment-fields]') as HTMLElement | null;
  const startingOccurrenceInput = form.querySelector(
    'input[name="starting_occurrence_number"]'
  ) as HTMLInputElement | null;
  const installmentLabelInput = form.querySelector(
    'input[name="installment_label"]'
  ) as HTMLInputElement | null;
  const installmentDisabledHint = form.querySelector(
    '[data-installment-disabled-hint]'
  ) as HTMLElement | null;
  const startMonthInput = form.querySelector(
    'input[name="start_month"]'
  ) as HTMLInputElement | null;
  const startDateInput = form.querySelector(
    'input[name="start_date_input"]'
  ) as HTMLInputElement | null;
  const startMonthBlock = form.querySelector(
    '[data-recurring-start-month-block]'
  ) as HTMLElement | null;
  const startDateBlock = form.querySelector(
    '[data-recurring-start-date-block]'
  ) as HTMLElement | null;

  const frequencySelect = form.querySelector(
    'select[name="frequency"]'
  ) as HTMLSelectElement | null;
  const intervalCountInput = form.querySelector(
    'input[name="interval_count"]'
  ) as HTMLInputElement | null;
  const frequencyUnitLabel = form.querySelector(
    '[data-frequency-unit-label]'
  ) as HTMLElement | null;
  const dayOfMonthBlock = form.querySelector(
    '[data-recurring-day-of-month-block]'
  ) as HTMLElement | null;
  const frequencyPresetBtns = Array.from(
    form.querySelectorAll<HTMLButtonElement>('[data-frequency-preset]')
  );
  const dayOfMonthSelect = form.querySelector(
    'select[name="day_of_month"]'
  ) as HTMLSelectElement | null;

  const ACTIVE_TYPE_CLASSES = [
    'bg-white',
    'shadow-sm',
    'text-primary',
    'font-bold',
    'hover:bg-white',
  ];
  const INACTIVE_TYPE_CLASSES = [
    'bg-transparent',
    'text-neutral',
    'font-medium',
    'hover:bg-base-300',
  ];

  const syncTypeOptionStyles = (): void => {
    const selectedType = getSelectedType();
    typeOptionLabels.forEach((label) => {
      const value = label.dataset.typeOption === 'income' ? 'income' : 'expense';
      const isActive = value === selectedType;
      ACTIVE_TYPE_CLASSES.forEach((className) => {
        label.classList.toggle(className, isActive);
      });
      INACTIVE_TYPE_CLASSES.forEach((className) => {
        label.classList.toggle(className, !isActive);
      });
    });
  };

  const defaultSubmitLabel =
    submitBtn?.dataset.defaultLabel || submitBtn?.textContent?.trim() || 'Save';

  const setLoading = (loading: boolean): void => {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    submitBtn.textContent = loading ? 'Saving...' : defaultSubmitLabel;
  };

  const showError = (message: string): void => {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  };

  const clearError = (): void => {
    if (!errorBox) return;
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
  };

  const closeDrawer = (): void => {
    drawer.dispatchEvent(new CustomEvent('drawer:close'));
  };

  const openDrawer = (): void => {
    drawer.dispatchEvent(new CustomEvent('drawer:open'));
  };

  const getSelectedType = (): 'expense' | 'income' => {
    const selected = typeInputs.find((input) => input.checked);
    return selected?.value === 'income' ? 'income' : 'expense';
  };

  const getSelectedEndMode = (): EndMode => {
    const selectedMode = endModeInputs.find((input) => input.checked)?.value;
    if (selectedMode === 'count' || selectedMode === 'date') {
      return selectedMode;
    }

    return 'none';
  };

  const filterCategoryOptions = (): void => {
    if (!categorySelect) return;

    const selectedType = getSelectedType();

    Array.from(categorySelect.options).forEach((option) => {
      const optionType = option.getAttribute('data-type');
      if (!option.value || !optionType) return;

      const visible = optionType === selectedType;
      option.hidden = !visible;
      option.disabled = !visible;

      if (!visible && categorySelect.value === option.value) {
        categorySelect.value = '';
      }
    });
  };

  const syncEndConditionUI = (): void => {
    const selectedEndMode = getSelectedEndMode();

    if (countContainer) {
      const showCountInput = selectedEndMode === 'count';
      countContainer.classList.toggle('hidden', !showCountInput);
      if (!showCountInput && totalOccurrencesInput) totalOccurrencesInput.value = '';
    }

    if (dateContainer) {
      const showDateInput = selectedEndMode === 'date';
      dateContainer.classList.toggle('hidden', !showDateInput);
      if (!showDateInput && endDateInput) endDateInput.value = '';
    }
  };

  const syncInstallmentState = (): void => {
    if (!installmentToggle || !totalOccurrencesInput) return;

    const nextState = normalizeInstallmentState({
      selectedEndMode: getSelectedEndMode(),
      totalOccurrencesValue: totalOccurrencesInput.value,
      isInstallmentChecked: installmentToggle.checked,
      startingOccurrenceNumber: startingOccurrenceInput?.value || '1',
      installmentLabel: installmentLabelInput?.value || 'Installment',
    });

    installmentToggle.disabled = !nextState.enabled;
    installmentToggle.checked = nextState.checked;
    if (startingOccurrenceInput) {
      startingOccurrenceInput.value = nextState.startingOccurrenceNumber;
    }
    if (installmentLabelInput) {
      installmentLabelInput.value = nextState.installmentLabel;
    }

    if (installmentFields) {
      installmentFields.classList.toggle('hidden', !nextState.showFields);
    }
    if (installmentDisabledHint) {
      installmentDisabledHint.classList.toggle('hidden', nextState.enabled);
    }
  };

  const syncFrequencyUI = (): void => {
    const freq = frequencySelect?.value || 'monthly';
    const interval = Number(intervalCountInput?.value || '1');
    const isWeekly = freq === 'weekly';

    if (dayOfMonthBlock) {
      dayOfMonthBlock.classList.toggle('hidden', isWeekly);
    }
    if (startMonthBlock) {
      startMonthBlock.classList.toggle('hidden', isWeekly);
    }
    if (startDateBlock) {
      startDateBlock.classList.toggle('hidden', !isWeekly);
    }
    if (dayOfMonthSelect) {
      dayOfMonthSelect.required = !isWeekly;
    }
    if (startMonthInput) {
      startMonthInput.required = !isWeekly;
      if (!isWeekly && !startMonthInput.value && startDateInput?.value) {
        startMonthInput.value = startDateInput.value.slice(0, 7);
      }
    }
    if (startDateInput) {
      startDateInput.required = isWeekly;
      if (isWeekly && !startDateInput.value && startMonthInput?.value) {
        startDateInput.value = `${startMonthInput.value}-01`;
      }
    }
    if (frequencyUnitLabel) {
      frequencyUnitLabel.textContent = isWeekly ? 'week(s)' : 'month(s)';
    }

    const presetKey = `${freq}-${interval}`;
    frequencyPresetBtns.forEach((btn) => {
      const isActive = btn.dataset.frequencyPreset === presetKey;
      btn.classList.toggle('btn-active', isActive);
      btn.classList.toggle('btn-accent', isActive);
    });
  };

  const setEndMode = (mode: EndMode): void => {
    endModeInputs.forEach((input) => {
      input.checked = input.value === mode;
    });
    syncEndConditionUI();
    syncInstallmentState();
  };

  const setType = (type: 'expense' | 'income'): void => {
    typeInputs.forEach((input) => {
      input.checked = input.value === type;
    });
    syncTypeOptionStyles();
    filterCategoryOptions();
  };

  const setFieldValue = (name: string, value: string): void => {
    const field = form.querySelector(`[name="${name}"]`) as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
      | null;
    if (field) field.value = value;
  };

  const syncAmountInputFormatter = (currencyValue: Currency): void => {
    if (!amountInput) return;
    amountFormatter?.cleanup();
    amountFormatter = attachAmountFormatter(amountInput, currencyValue);
    amountInput.setAttribute('data-amount-currency', currencyValue);
  };

  const resetFormState = (): void => {
    form.reset();
    clearError();
    setLoading(false);

    const templateId = form.querySelector('input[name="template_id"]') as HTMLInputElement | null;
    const startingInput = form.querySelector(
      'input[name="starting_occurrence_number"]'
    ) as HTMLInputElement | null;

    if (templateId) templateId.value = '';
    if (startingInput) startingInput.value = '1';
    if (startMonthInput) startMonthInput.value = getCurrentMonthValue();
    if (startDateInput) startDateInput.value = getCurrentDateValue();

    if (totalOccurrencesInput) totalOccurrencesInput.value = '';
    if (endDateInput) endDateInput.value = '';
    if (descriptionDetails) descriptionDetails.open = false;
    if (frequencySelect) frequencySelect.value = 'monthly';
    if (intervalCountInput) intervalCountInput.value = '1';

    if (currencySelect) {
      const currency = isValidCurrency(currencySelect.value)
        ? currencySelect.value
        : DEFAULT_CURRENCY;
      syncAmountInputFormatter(currency);
    }

    setType('expense');
    setEndMode('none');
    syncFrequencyUI();
    form.dataset.mode = 'create';

    if (drawerHeading) drawerHeading.textContent = 'New Recurring';
    if (drawerSubtitle) drawerSubtitle.textContent = 'Set up an automatic bill or income.';
  };

  const populateEditState = (template: RecurringTemplateLike): void => {
    resetFormState();
    form.dataset.mode = 'edit';

    if (drawerHeading) drawerHeading.textContent = 'Edit Recurring';
    if (drawerSubtitle) drawerSubtitle.textContent = `Editing "${template.name}"`;

    setFieldValue('template_id', template.id);
    setFieldValue('name', template.name);

    const currencyValue = isValidCurrency(template.currency) ? template.currency : DEFAULT_CURRENCY;
    setFieldValue('amount', formatAmountForDisplay(template.amount, currencyValue));
    setFieldValue('currency', template.currency);

    syncAmountInputFormatter(currencyValue);

    setFieldValue('category_id', template.category?.id || '');
    setFieldValue('account_id', template.account?.id || '');
    setFieldValue('day_of_month', String(template.day_of_month));
    setFieldValue('frequency', template.frequency || 'monthly');
    setFieldValue('interval_count', String(template.interval_count || 1));
    setFieldValue('start_month', template.start_date.slice(0, 7));
    setFieldValue('start_date_input', template.start_date);
    setFieldValue('description', template.description || '');
    if (descriptionDetails) {
      descriptionDetails.open = Boolean(
        template.description && template.description.trim().length > 0
      );
    }

    setType(template.type);

    if (template.total_occurrences) {
      setEndMode('count');
      setFieldValue('total_occurrences', String(template.total_occurrences));
      setFieldValue('end_date', '');
    } else if (template.end_date) {
      setEndMode('date');
      setFieldValue('total_occurrences', '');
      setFieldValue('end_date', template.end_date);
    } else {
      setEndMode('none');
      setFieldValue('total_occurrences', '');
      setFieldValue('end_date', '');
    }

    if (installmentToggle) {
      installmentToggle.checked = template.is_installment;
    }

    setFieldValue('starting_occurrence_number', String(template.starting_occurrence_number || 1));
    setFieldValue('installment_label', template.installment_label || 'Installment');

    syncInstallmentState();
    syncFrequencyUI();
  };

  const populateCreatePrefill = (prefill: RecurringTemplatePrefill): void => {
    resetFormState();

    setType(prefill.type);
    setFieldValue('name', prefill.name);

    const currencyValue = isValidCurrency(prefill.currency) ? prefill.currency : DEFAULT_CURRENCY;
    setFieldValue('amount', formatAmountForDisplay(prefill.amount, currencyValue));
    setFieldValue('currency', prefill.currency);

    syncAmountInputFormatter(currencyValue);

    setFieldValue('category_id', prefill.category_id);
    setFieldValue('account_id', prefill.account_id);
    setFieldValue('day_of_month', String(prefill.day_of_month));
    setFieldValue('start_month', prefill.start_month);
    setFieldValue('start_date_input', `${prefill.start_month}-01`);
    setFieldValue('description', prefill.description || '');

    if (descriptionDetails) {
      descriptionDetails.open = Boolean(
        prefill.description && prefill.description.trim().length > 0
      );
    }

    if (drawerHeading) drawerHeading.textContent = 'New Recurring';
    if (drawerSubtitle) drawerSubtitle.textContent = 'Review and save this converted transaction.';
  };

  const parseApiError = async (response: Response): Promise<string> => {
    try {
      const body = await response.json();
      return body?.error?.message || body?.message || 'Failed to save recurring transaction';
    } catch {
      return 'Failed to save recurring transaction';
    }
  };

  const buildPayload = (): Record<string, unknown> | null => {
    const templateId = (form.querySelector('input[name="template_id"]') as HTMLInputElement | null)
      ?.value;
    const isEditMode = Boolean(templateId);

    const name = (
      form.querySelector('input[name="name"]') as HTMLInputElement | null
    )?.value.trim();
    const rawAmount = (
      form.querySelector('input[name="amount"]') as HTMLInputElement | null
    )?.value.trim();
    const currency = (form.querySelector('select[name="currency"]') as HTMLSelectElement | null)
      ?.value;
    const amount =
      rawAmount && currency && isValidCurrency(currency)
        ? stripAmountFormatting(rawAmount, currency)
        : '';
    const categoryId = (
      form.querySelector('select[name="category_id"]') as HTMLSelectElement | null
    )?.value;
    const accountId = (form.querySelector('select[name="account_id"]') as HTMLSelectElement | null)
      ?.value;
    const dayOfMonth = (
      form.querySelector('select[name="day_of_month"]') as HTMLSelectElement | null
    )?.value;
    const startMonth = startMonthInput?.value;
    const startDate = startDateInput?.value;
    const description = (
      form.querySelector('textarea[name="description"]') as HTMLTextAreaElement | null
    )?.value.trim();

    const isWeekly = (frequencySelect?.value || 'monthly') === 'weekly';
    if (!name || !amount || !currency || !categoryId || !accountId) {
      showError('Please complete all required fields.');
      return null;
    }
    if (isWeekly && !startDate) {
      showError('Please complete all required fields.');
      return null;
    }
    if (!isWeekly && !startMonth) {
      showError('Please complete all required fields.');
      return null;
    }
    if (!isWeekly && !dayOfMonth) {
      showError('Please complete all required fields.');
      return null;
    }

    const selectedEndMode = getSelectedEndMode();
    if (selectedEndMode === 'count' && !totalOccurrencesInput?.value) {
      showError('Please complete all required fields.');
      return null;
    }
    if (selectedEndMode === 'date' && !endDateInput?.value) {
      showError('Please complete all required fields.');
      return null;
    }

    const payload: Record<string, unknown> = {
      name,
      type: getSelectedType(),
      amount,
      currency,
      category_id: categoryId,
      account_id: accountId,
      day_of_month: Number(dayOfMonth),
      frequency: frequencySelect?.value || 'monthly',
      interval_count: Number(intervalCountInput?.value || '1'),
      start_date: isWeekly ? startDate! : `${startMonth!}-01`,
      is_installment: false,
      starting_occurrence_number: 1,
    };

    if ((frequencySelect?.value || 'monthly') === 'weekly') {
      delete payload.day_of_month;
    }

    if (description) {
      payload.description = description;
    } else if (isEditMode) {
      payload.description = null;
    }

    if (selectedEndMode === 'count' && totalOccurrencesInput?.value) {
      payload.total_occurrences = Number(totalOccurrencesInput.value);
    } else if (isEditMode) {
      payload.total_occurrences = null;
    }

    if (selectedEndMode === 'date' && endDateInput?.value) {
      payload.end_date = endDateInput.value;
    } else if (isEditMode) {
      payload.end_date = null;
    }

    const enableInstallment = Boolean(
      installmentToggle && !installmentToggle.disabled && installmentToggle.checked
    );
    if (enableInstallment) {
      payload.is_installment = true;
      const startingInput = form.querySelector(
        'input[name="starting_occurrence_number"]'
      ) as HTMLInputElement | null;
      payload.starting_occurrence_number = Number(startingInput?.value || '1');

      const installmentLabelInput = form.querySelector(
        'input[name="installment_label"]'
      ) as HTMLInputElement | null;
      const trimmedInstallmentLabel = installmentLabelInput?.value.trim();
      if (trimmedInstallmentLabel) {
        payload.installment_label = trimmedInstallmentLabel;
      } else if (isEditMode) {
        payload.installment_label = null;
      }
    } else if (isEditMode) {
      payload.installment_label = null;
    }

    return payload;
  };

  typeInputs.forEach((input) => {
    input.addEventListener(
      'change',
      () => {
        syncTypeOptionStyles();
        filterCategoryOptions();
      },
      { signal }
    );
  });

  currencySelect?.addEventListener(
    'change',
    () => {
      if (amountInput && currencySelect) {
        const currency = isValidCurrency(currencySelect.value)
          ? currencySelect.value
          : DEFAULT_CURRENCY;
        syncAmountInputFormatter(currency);
        amountInput.value = formatAmountForDisplay(
          stripAmountFormatting(amountInput.value, currency),
          currency
        );
      }
    },
    { signal }
  );

  endModeInputs.forEach((input) => {
    input.addEventListener(
      'change',
      () => {
        syncEndConditionUI();
        syncInstallmentState();
      },
      { signal }
    );
  });

  totalOccurrencesInput?.addEventListener(
    'input',
    () => {
      syncInstallmentState();
    },
    { signal }
  );

  installmentToggle?.addEventListener(
    'change',
    () => {
      if (installmentFields) {
        installmentFields.classList.toggle('hidden', !installmentToggle.checked);
      }
    },
    { signal }
  );

  frequencySelect?.addEventListener(
    'change',
    () => {
      syncFrequencyUI();
    },
    { signal }
  );

  intervalCountInput?.addEventListener(
    'input',
    () => {
      syncFrequencyUI();
    },
    { signal }
  );

  frequencyPresetBtns.forEach((btn) => {
    btn.addEventListener(
      'click',
      () => {
        const preset = btn.dataset.frequencyPreset;
        if (!preset) return;
        const [freq, count] = preset.split('-');
        if (frequencySelect) frequencySelect.value = freq;
        if (intervalCountInput) intervalCountInput.value = count;
        syncFrequencyUI();
      },
      { signal }
    );
  });

  cancelBtn?.addEventListener(
    'click',
    () => {
      closeDrawer();
    },
    { signal }
  );

  form.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();
      clearError();

      const payload = buildPayload();
      if (!payload) return;

      const templateId = (
        form.querySelector('input[name="template_id"]') as HTMLInputElement | null
      )?.value;

      const method = templateId ? 'PUT' : 'POST';
      const url = templateId ? `/api/recurring/${templateId}` : '/api/recurring';

      setLoading(true);
      try {
        const response = await fetch(url, {
          method,
          headers: getCsrfHeaders({
            'Content-Type': 'application/json',
            Accept: 'application/json',
          }),
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        closeDrawer();
        window.dispatchEvent(new CustomEvent('recurring:templates-updated'));
        addToast(
          templateId ? 'Recurring transaction updated' : 'Recurring transaction created',
          'success'
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to save recurring transaction';
        showError(message);
        addToast(message, 'error');
      } finally {
        setLoading(false);
      }
    },
    { signal }
  );

  document.addEventListener(
    'open-recurring-template-drawer',
    ((event: Event) => {
      const detail = (event as CustomEvent<{ prefill?: RecurringTemplatePrefill }>).detail;
      if (detail?.prefill) {
        populateCreatePrefill(detail.prefill);
      } else {
        resetFormState();
      }
      openDrawer();
    }) as EventListener,
    { signal }
  );

  document.addEventListener(
    'edit-recurring-template-drawer',
    ((event: Event) => {
      const detail = (event as CustomEvent<RecurringTemplateLike>).detail;
      if (!detail || typeof detail !== 'object' || !('id' in detail)) return;
      populateEditState(detail);
      openDrawer();
    }) as EventListener,
    { signal }
  );

  // Initial defaults
  resetFormState();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRecurringTemplateForm);
} else {
  initRecurringTemplateForm();
}

document.addEventListener('astro:page-load', initRecurringTemplateForm);
document.addEventListener('astro:before-swap', () => {
  controller?.abort();
  controller = null;
  amountFormatter?.cleanup();
  amountFormatter = null;
});
