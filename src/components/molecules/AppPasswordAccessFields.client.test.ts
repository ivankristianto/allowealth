import { describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { readAccessFields, syncCustomPermissions } from './AppPasswordAccessFields.client';

function formData(entries: Array<[string, string]>): FormData {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

describe('readAccessFields', () => {
  test('sends a preset as scope and ignores any checked permissions', () => {
    expect(readAccessFields(formData([['preset', 'read']]))).toEqual({ scope: 'read' });
    expect(
      readAccessFields(
        formData([
          ['preset', 'read-write'],
          ['permissions', 'accounts:read'],
        ])
      )
    ).toEqual({ scope: 'read-write' });
  });

  test('sends Custom as the checked permissions, never as a scope', () => {
    expect(
      readAccessFields(
        formData([
          ['preset', 'custom'],
          ['permissions', 'transactions:create'],
          ['permissions', 'accounts:read'],
        ])
      )
    ).toEqual({ permissions: ['transactions:create', 'accounts:read'] });
    expect(readAccessFields(formData([['preset', 'custom']]))).toEqual({ permissions: [] });
  });
});

function accessForm(checkedPreset: string): HTMLFormElement {
  const document = new Window().document;
  const form = document.createElement('form');
  for (const preset of ['read', 'read-write', 'custom']) {
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'preset';
    radio.value = preset;
    radio.checked = preset === checkedPreset;
    radio.setAttribute('data-app-password-preset', '');
    form.append(radio);
  }
  const custom = document.createElement('fieldset');
  custom.setAttribute('data-app-password-custom-permissions', '');
  custom.hidden = checkedPreset !== 'custom';
  custom.disabled = checkedPreset !== 'custom';
  form.append(custom);
  return form as unknown as HTMLFormElement;
}

function customFieldset(form: HTMLFormElement): HTMLFieldSetElement {
  const custom = form.querySelector<HTMLFieldSetElement>('[data-app-password-custom-permissions]');
  if (!custom) throw new Error('fixture has no custom fieldset');
  return custom;
}

function choose(form: HTMLFormElement, preset: string): void {
  const radio = form.querySelector<HTMLInputElement>(
    `[data-app-password-preset][value="${preset}"]`
  );
  if (!radio) throw new Error(`fixture has no ${preset} radio`);
  radio.checked = true;
}

describe('syncCustomPermissions', () => {
  test('shows and enables the checkboxes when Custom is chosen', () => {
    const form = accessForm('read');

    choose(form, 'custom');
    syncCustomPermissions(form);

    expect(customFieldset(form).hidden).toBe(false);
    expect(customFieldset(form).disabled).toBe(false);
  });

  test('hides and disables them again for a preset, so they stay out of the body', () => {
    const form = accessForm('custom');

    choose(form, 'read-write');
    syncCustomPermissions(form);

    expect(customFieldset(form).hidden).toBe(true);
    expect(customFieldset(form).disabled).toBe(true);
  });
});
