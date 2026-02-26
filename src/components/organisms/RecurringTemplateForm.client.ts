import { getCsrfHeaders } from '@/lib/csrf-client';
import { addToast } from '@/lib/stores/toastStore';

interface RecurringTemplateLike {
  id: string;
  name: string;
  type: 'expense' | 'income';
  amount: string;
  currency: string;
  category: { id: string };
  account: { id: string };
  day_of_month: number;
  start_date: string;
  end_date: string | null;
  total_occurrences: number | null;
  is_installment: boolean;
  installment_label: string | null;
  starting_occurrence_number: number;
  description: string | null;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
}

let controller: AbortController | null = null;

function getCurrentMonthValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
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

  const useCount = form.querySelector('input[name="use_count"]') as HTMLInputElement | null;
  const useDate = form.querySelector('input[name="use_date"]') as HTMLInputElement | null;
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
  const installmentDisabledHint = form.querySelector(
    '[data-installment-disabled-hint]'
  ) as HTMLElement | null;
  const startMonthInput = form.querySelector(
    'input[name="start_month"]'
  ) as HTMLInputElement | null;

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
    if (countContainer && useCount) {
      countContainer.classList.toggle('hidden', !useCount.checked);
      if (!useCount.checked && totalOccurrencesInput) totalOccurrencesInput.value = '';
    }

    if (dateContainer && useDate) {
      dateContainer.classList.toggle('hidden', !useDate.checked);
      if (!useDate.checked && endDateInput) endDateInput.value = '';
    }
  };

  const syncInstallmentState = (): void => {
    if (!installmentToggle || !totalOccurrencesInput) return;

    const hasCount = Boolean(useCount?.checked);
    const countValue = Number.parseInt(totalOccurrencesInput.value || '0', 10);
    const enableInstallment = hasCount && countValue > 0;

    installmentToggle.disabled = !enableInstallment;
    if (!enableInstallment) {
      installmentToggle.checked = false;
    }

    if (installmentFields) {
      installmentFields.classList.toggle('hidden', !installmentToggle.checked);
    }
    if (installmentDisabledHint) {
      installmentDisabledHint.classList.toggle('hidden', enableInstallment);
    }
  };

  const setType = (type: 'expense' | 'income'): void => {
    typeInputs.forEach((input) => {
      input.checked = input.value === type;
    });
    syncTypeOptionStyles();
    filterCategoryOptions();
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

    if (useCount) useCount.checked = true;
    if (useDate) useDate.checked = false;
    if (totalOccurrencesInput) totalOccurrencesInput.value = '12';
    if (descriptionDetails) descriptionDetails.open = false;

    setType('expense');
    syncEndConditionUI();
    syncInstallmentState();
    form.dataset.mode = 'create';

    if (drawerHeading) drawerHeading.textContent = 'New Recurring';
    if (drawerSubtitle) drawerSubtitle.textContent = 'Set up an automatic bill or income.';
  };

  const populateEditState = (template: RecurringTemplateLike): void => {
    resetFormState();
    form.dataset.mode = 'edit';

    if (drawerHeading) drawerHeading.textContent = 'Edit Recurring';
    if (drawerSubtitle) drawerSubtitle.textContent = `Editing "${template.name}"`;

    const setFieldValue = (name: string, value: string): void => {
      const field = form.querySelector(`[name="${name}"]`) as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
        | null;
      if (field) field.value = value;
    };

    setFieldValue('template_id', template.id);
    setFieldValue('name', template.name);
    setFieldValue('amount', template.amount);
    setFieldValue('currency', template.currency);
    setFieldValue('category_id', template.category?.id || '');
    setFieldValue('account_id', template.account?.id || '');
    setFieldValue('day_of_month', String(template.day_of_month));
    setFieldValue('start_month', template.start_date.slice(0, 7));
    setFieldValue('description', template.description || '');
    if (descriptionDetails) {
      descriptionDetails.open = Boolean(
        template.description && template.description.trim().length > 0
      );
    }

    setType(template.type);

    if (template.total_occurrences && useCount) {
      useCount.checked = true;
      setFieldValue('total_occurrences', String(template.total_occurrences));
    } else if (useCount) {
      useCount.checked = false;
      setFieldValue('total_occurrences', '');
    }

    if (template.end_date && useDate) {
      useDate.checked = true;
      setFieldValue('end_date', template.end_date);
    } else if (useDate) {
      useDate.checked = false;
      setFieldValue('end_date', '');
    }

    if (installmentToggle) {
      installmentToggle.checked = template.is_installment;
    }

    setFieldValue('starting_occurrence_number', String(template.starting_occurrence_number || 1));
    setFieldValue('installment_label', template.installment_label || 'Installment');

    syncEndConditionUI();
    syncInstallmentState();
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
    const amount = (
      form.querySelector('input[name="amount"]') as HTMLInputElement | null
    )?.value.trim();
    const currency = (form.querySelector('select[name="currency"]') as HTMLSelectElement | null)
      ?.value;
    const categoryId = (
      form.querySelector('select[name="category_id"]') as HTMLSelectElement | null
    )?.value;
    const accountId = (form.querySelector('select[name="account_id"]') as HTMLSelectElement | null)
      ?.value;
    const dayOfMonth = (
      form.querySelector('select[name="day_of_month"]') as HTMLSelectElement | null
    )?.value;
    const startMonth = startMonthInput?.value;
    const description = (
      form.querySelector('textarea[name="description"]') as HTMLTextAreaElement | null
    )?.value.trim();

    if (!name || !amount || !currency || !categoryId || !accountId || !dayOfMonth || !startMonth) {
      showError('Please complete all required fields.');
      return null;
    }

    const byCount = Boolean(useCount?.checked);
    const byDate = Boolean(useDate?.checked);
    if (!byCount && !byDate) {
      showError('At least one end condition is required.');
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
      start_date: `${startMonth}-01`,
      is_installment: false,
      starting_occurrence_number: 1,
    };

    if (description) {
      payload.description = description;
    } else if (isEditMode) {
      payload.description = null;
    }

    if (byCount && totalOccurrencesInput?.value) {
      payload.total_occurrences = Number(totalOccurrencesInput.value);
    } else if (isEditMode) {
      payload.total_occurrences = null;
    }

    if (byDate && endDateInput?.value) {
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

  useCount?.addEventListener(
    'change',
    () => {
      syncEndConditionUI();
      syncInstallmentState();
    },
    { signal }
  );

  useDate?.addEventListener(
    'change',
    () => {
      syncEndConditionUI();
    },
    { signal }
  );

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
    () => {
      resetFormState();
      openDrawer();
    },
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
});
