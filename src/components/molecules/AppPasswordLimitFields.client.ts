import type { AppPasswordLimits } from '@/lib/app-password-limits';

interface LimitsBody {
  limits: AppPasswordLimits;
}

/** The limits part of a create or edit body. Always sent, so unticking a limit clears it. */
export function readLimitFields(formData: FormData): LimitsBody {
  return {
    limits: {
      ...(formData.has('limit_categories') && {
        category_ids: formData.getAll('category_ids').map(String),
      }),
      ...(formData.has('own_transactions_only') && { own_transactions_only: true }),
    },
  };
}

/** Shows the category picker only while its limit is ticked; disabled boxes stay out of FormData. */
export function syncCategoryLimit(form: HTMLFormElement): void {
  const picker = form.querySelector<HTMLFieldSetElement>('[data-app-password-limit-categories]');
  if (!picker) return;
  const isOn =
    form.querySelector<HTMLInputElement>('[data-app-password-category-limit]')?.checked ?? false;
  picker.hidden = !isOn;
  picker.disabled = !isOn;
}
