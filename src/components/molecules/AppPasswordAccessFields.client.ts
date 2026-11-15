export type AccessBody = { scope: string } | { permissions: string[] };

/** The access part of a create or edit body: a preset scope, or the checked permissions. */
export function readAccessFields(formData: FormData): AccessBody {
  const preset = String(formData.get('preset') ?? '');
  if (preset === 'custom') {
    return { permissions: formData.getAll('permissions').map(String) };
  }
  return { scope: preset };
}

/** Shows the custom checkboxes only for the Custom preset; disabled ones stay out of FormData. */
export function syncCustomPermissions(form: HTMLFormElement): void {
  const custom = form.querySelector<HTMLFieldSetElement>('[data-app-password-custom-permissions]');
  if (!custom) return;
  const isCustom =
    form.querySelector<HTMLInputElement>('[data-app-password-preset]:checked')?.value === 'custom';
  custom.hidden = !isCustom;
  custom.disabled = !isCustom;
}
