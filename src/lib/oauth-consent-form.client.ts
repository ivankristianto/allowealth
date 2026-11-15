/** Shows the consent page's no-permissions warning while no permission box is ticked. */
export function syncNoPermissionsWarning(form: HTMLFormElement): void {
  const warning = form.querySelector<HTMLElement>('[data-oauth-no-permissions]');
  if (!warning) return;
  warning.hidden = form.querySelector('input[data-oauth-permission]:checked') !== null;
}
