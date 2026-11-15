import { describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { syncNoPermissionsWarning } from './oauth-consent-form.client';

function consentForm(checked: boolean[]): HTMLFormElement {
  const document = new Window().document;
  const form = document.createElement('form');
  const email = document.createElement('input');
  email.type = 'checkbox';
  email.name = 'scope';
  email.value = 'email';
  email.checked = true;
  form.append(email);
  checked.forEach((isChecked, index) => {
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.name = 'scope';
    box.value = `allowealth:permission-${index}`;
    box.checked = isChecked;
    box.setAttribute('data-oauth-permission', '');
    form.append(box);
  });
  const warning = document.createElement('div');
  warning.setAttribute('data-oauth-no-permissions', '');
  form.append(warning);
  return form as unknown as HTMLFormElement;
}

const warningOf = (form: HTMLFormElement) =>
  form.querySelector<HTMLElement>('[data-oauth-no-permissions]')!;

describe('syncNoPermissionsWarning', () => {
  test('hides the warning while any permission is ticked', () => {
    const form = consentForm([false, true]);
    syncNoPermissionsWarning(form);
    expect(warningOf(form).hidden).toBe(true);
  });

  test('shows the warning once every permission is unticked, whatever else stays ticked', () => {
    const form = consentForm([true, false]);
    syncNoPermissionsWarning(form);
    form.querySelector<HTMLInputElement>('input[data-oauth-permission]:checked')!.checked = false;

    syncNoPermissionsWarning(form);

    expect(warningOf(form).hidden).toBe(false);
  });

  test('shows the warning when the request offered no permissions at all', () => {
    const form = consentForm([]);
    syncNoPermissionsWarning(form);
    expect(warningOf(form).hidden).toBe(false);
  });
});
